'use server';

import { createClient } from '@/lib/supabase/server';
import type { CartLine } from '@/lib/shop/cart-store';
import {
  getVariantMaxOrderQty,
  isVariantSelectable,
} from '@/lib/shop/variant-stock';

export interface ReorderSkippedItem {
  productName: string;
  reason: string;
}

export type ReorderOrderToCartResult =
  | {
      ok: true;
      lines: CartLine[];
      addedCount: number;
      skipped: ReorderSkippedItem[];
    }
  | {
      ok: false;
      lines: [];
      addedCount: 0;
      skipped: ReorderSkippedItem[];
      error: string;
    };

interface VariantCatalogRow {
  id: string;
  label: string | null;
  price: number;
  stock: number | null;
  product: {
    id: string;
    is_active: boolean | null;
    name: string | null;
    image_url: string | null;
    brand: {
      vendor: VendorCatalogRow | VendorCatalogRow[] | null;
    } | null;
  } | null;
}

function readVendorFromBrand(
  brand: VariantCatalogRow['product'] extends infer P
    ? P extends { brand: infer B }
      ? B
      : null
    : null,
): VendorCatalogRow | null {
  if (!brand || typeof brand !== 'object') return null;
  const vendorRaw = (brand as { vendor?: VendorCatalogRow | VendorCatalogRow[] | null }).vendor;
  if (Array.isArray(vendorRaw)) return vendorRaw[0] ?? null;
  return vendorRaw ?? null;
}

function readProductName(row: VariantCatalogRow | undefined, fallback: string): string {
  const name = row?.product?.name?.trim();
  if (name) return name;
  return fallback;
}

interface VendorCatalogRow {
  id: string;
  name: string | null;
  shipping_fee: number | null;
  free_shipping_threshold: number | null;
  lead_time_days: number | null;
  is_active: boolean | null;
}

function normalizeVendor(vendor: VendorCatalogRow | null | undefined): {
  id: string;
  name: string;
  shippingFee: number;
  freeShippingThreshold: number | null;
  leadTimeDays: number;
  isActive: boolean;
} | null {
  if (!vendor) return null;
  if (typeof vendor.id !== 'string' || !vendor.id) return null;
  return {
    id: vendor.id,
    name: vendor.name?.trim() || '廠商',
    shippingFee: Number(vendor.shipping_fee ?? 0),
    freeShippingThreshold:
      vendor.free_shipping_threshold == null ?
        null
      : Number(vendor.free_shipping_threshold),
    leadTimeDays: Number(vendor.lead_time_days ?? 3),
    isActive: vendor.is_active === true,
  };
}

export async function reorderOrderToCart(orderId: string): Promise<ReorderOrderToCartResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      lines: [],
      addedCount: 0,
      skipped: [],
      error: '請先登入',
    };
  }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(
      `
      id,
      items:order_items(
        qty,
        variant_id,
        variant:product_variants(
          label,
          product:products(name)
        )
      )
    `,
    )
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (orderErr) {
    return {
      ok: false,
      lines: [],
      addedCount: 0,
      skipped: [],
      error: orderErr.message,
    };
  }

  if (!order) {
    return {
      ok: false,
      lines: [],
      addedCount: 0,
      skipped: [],
      error: '找不到訂單',
    };
  }

  const orderItems = (order.items ?? []) as Array<{
    qty: number;
    variant_id: string;
    variant?: {
      label?: string | null;
      product?: { name?: string | null } | null;
    } | null;
  }>;

  if (orderItems.length === 0) {
    return {
      ok: false,
      lines: [],
      addedCount: 0,
      skipped: [],
      error: '此訂單沒有商品',
    };
  }

  const variantIds = orderItems.map((item) => item.variant_id);
  const { data: variantRows, error: variantErr } = await supabase
    .from('product_variants')
    .select(
      `
      id,
      label,
      price,
      stock,
      product:products!inner(
        id,
        is_active,
        name,
        image_url,
        brand:brands!inner(
          vendor:vendors!inner(
            id,
            name,
            shipping_fee,
            free_shipping_threshold,
            lead_time_days,
            is_active
          )
        )
      )
    `,
    )
    .in('id', variantIds);

  if (variantErr) {
    return {
      ok: false,
      lines: [],
      addedCount: 0,
      skipped: [],
      error: variantErr.message,
    };
  }

  const byVariantId = new Map<string, VariantCatalogRow>();
  for (const row of variantRows ?? []) {
    byVariantId.set(row.id, row as unknown as VariantCatalogRow);
  }

  const lines: CartLine[] = [];
  const skipped: ReorderSkippedItem[] = [];

  for (const item of orderItems) {
    const fallbackName =
      item.variant?.product?.name?.trim() ||
      item.variant?.label?.trim() ||
      '商品';
    const requestedQty = Math.max(1, Math.floor(Number(item.qty) || 0));
    const catalog = byVariantId.get(item.variant_id);

    if (!catalog) {
      skipped.push({ productName: fallbackName, reason: '規格已不存在' });
      continue;
    }

    const productName = readProductName(catalog, fallbackName);

    if (catalog.product?.is_active !== true) {
      skipped.push({ productName, reason: '商品已下架' });
      continue;
    }

    const vendor = normalizeVendor(readVendorFromBrand(catalog.product?.brand ?? null));
    if (!vendor || !vendor.isActive) {
      skipped.push({ productName, reason: '廠商已停用' });
      continue;
    }

    const stock = catalog.stock == null ? null : Number(catalog.stock);
    if (!isVariantSelectable(stock)) {
      skipped.push({ productName, reason: '暫無庫存' });
      continue;
    }

    const maxQty = getVariantMaxOrderQty(stock);
    const qty =
      maxQty == null ? requestedQty : Math.min(requestedQty, maxQty);

    if (qty < 1) {
      skipped.push({ productName, reason: '暫無庫存' });
      continue;
    }

    lines.push({
      variantId: catalog.id,
      productId: catalog.product!.id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      productName,
      variantLabel: catalog.label?.trim() || '規格',
      qty,
      unitPrice: Number(catalog.price),
      shippingFee: vendor.shippingFee,
      freeShippingThreshold: vendor.freeShippingThreshold,
      leadTimeDays: vendor.leadTimeDays,
      imageUrl: catalog.product?.image_url?.trim() || null,
    });
  }

  if (lines.length === 0) {
    return {
      ok: false,
      lines: [],
      addedCount: 0,
      skipped,
      error: '商品皆無法加入購物車',
    };
  }

  return {
    ok: true,
    lines,
    addedCount: lines.length,
    skipped,
  };
}
