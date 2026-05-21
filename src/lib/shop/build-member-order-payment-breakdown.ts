import { isCheckoutSnapshotLike } from '@/lib/shop/build-remaining-logistics-queue';

export interface MemberOrderBreakdownLine {
  id: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  qty: number;
  unitPrice: number;
  imageUrl: string | null;
}

export interface MemberOrderBreakdownVendor {
  vendorId: string;
  vendorName: string;
  selectedShippingMethodLabel: string | null;
  itemsSubtotal: number;
  effectiveShipping: number;
  gapToFreeShipping: number | null;
  lines: MemberOrderBreakdownLine[];
}

export interface MemberOrderPaymentBreakdown {
  vendors: MemberOrderBreakdownVendor[];
  itemsSubtotal: number;
  shippingTotal: number;
  grandTotal: number;
}

export interface MemberOrderBreakdownItemInput {
  id: string;
  qty: number;
  unit_price: number;
  variant_id: string;
  vendor_id: string | null;
  variant: {
    label?: string | null;
    product?: { name?: string | null; image_url?: string | null } | null;
  } | null;
  vendor?: { name?: string | null } | null;
}

interface SnapshotVendorLike {
  vendorId: string;
  vendorName: string;
  itemsSubtotal?: number;
  effectiveShipping?: number;
  freeShippingThreshold?: number | null;
  shippingMethodLabel?: string | null;
  lines?: Array<{ variantId: string; qty: number; unitPrice: number }>;
}

function gapToFreeShipping(
  itemsSubtotal: number,
  effectiveShipping: number,
  threshold: number | null | undefined,
): number | null {
  if (threshold == null || threshold <= 0) return null;
  if (effectiveShipping === 0) return null;
  return Math.max(0, Math.round(threshold - itemsSubtotal));
}

function readProductName(variant: MemberOrderBreakdownItemInput['variant']): string {
  const row = variant?.product;
  const name = row?.name;
  if (typeof name === 'string' && name.trim().length > 0) return name.trim();
  return '商品';
}

function normalizeOrderItem(row: MemberOrderBreakdownItemInput): MemberOrderBreakdownLine {
  return {
    id: row.id,
    variantId: row.variant_id,
    productName: readProductName(row.variant),
    variantLabel: row.variant?.label?.trim() || '規格',
    qty: row.qty,
    unitPrice: Number(row.unit_price),
    imageUrl: row.variant?.product?.image_url?.trim() || null,
  };
}

function itemsByVariantId(
  items: MemberOrderBreakdownItemInput[],
): Map<string, MemberOrderBreakdownLine> {
  const map = new Map<string, MemberOrderBreakdownLine>();
  for (const row of items) {
    map.set(row.variant_id, normalizeOrderItem(row));
  }
  return map;
}

function buildLineFromSnapshot(
  snapLine: { variantId: string; qty: number; unitPrice: number },
  itemLookup: Map<string, MemberOrderBreakdownLine>,
): MemberOrderBreakdownLine {
  const fromItem = itemLookup.get(snapLine.variantId);
  if (fromItem) {
    return {
      ...fromItem,
      qty: snapLine.qty,
      unitPrice: snapLine.unitPrice,
    };
  }
  return {
    id: snapLine.variantId,
    variantId: snapLine.variantId,
    productName: '商品',
    variantLabel: '規格',
    qty: snapLine.qty,
    unitPrice: snapLine.unitPrice,
    imageUrl: null,
  };
}

function buildFromSnapshot(
  checkoutSnapshot: unknown,
  items: MemberOrderBreakdownItemInput[],
  orderTotal: number,
): MemberOrderPaymentBreakdown | null {
  if (!isCheckoutSnapshotLike(checkoutSnapshot)) return null;

  const snap = checkoutSnapshot as {
    vendors?: SnapshotVendorLike[];
    itemsSubtotal?: number;
    shippingTotal?: number;
  };
  const vendors = snap.vendors ?? [];
  if (vendors.length === 0) return null;

  const itemLookup = itemsByVariantId(items);
  const breakdownVendors: MemberOrderBreakdownVendor[] = vendors.map((vendor) => {
    const itemsSubtotal = Math.round(Number(vendor.itemsSubtotal ?? 0));
    const effectiveShipping = Math.round(Number(vendor.effectiveShipping ?? 0));
    const snapLines = vendor.lines ?? [];

    return {
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      selectedShippingMethodLabel: vendor.shippingMethodLabel?.trim() || null,
      itemsSubtotal,
      effectiveShipping,
      gapToFreeShipping: gapToFreeShipping(
        itemsSubtotal,
        effectiveShipping,
        vendor.freeShippingThreshold,
      ),
      lines: snapLines.map((line) => buildLineFromSnapshot(line, itemLookup)),
    };
  });

  const itemsSubtotal =
    typeof snap.itemsSubtotal === 'number' && Number.isFinite(snap.itemsSubtotal) ?
      Math.round(snap.itemsSubtotal)
    : breakdownVendors.reduce((sum, v) => sum + v.itemsSubtotal, 0);

  const shippingTotal =
    typeof snap.shippingTotal === 'number' && Number.isFinite(snap.shippingTotal) ?
      Math.round(snap.shippingTotal)
    : breakdownVendors.reduce((sum, v) => sum + v.effectiveShipping, 0);

  const grandTotal = Math.round(orderTotal);

  return {
    vendors: breakdownVendors,
    itemsSubtotal,
    shippingTotal,
    grandTotal,
  };
}

function buildFromOrderItems(
  items: MemberOrderBreakdownItemInput[],
  orderTotal: number,
): MemberOrderPaymentBreakdown {
  const byVendor = new Map<string, MemberOrderBreakdownVendor>();

  for (const row of items) {
    const line = normalizeOrderItem(row);
    const vendorId = row.vendor_id?.trim() || 'unknown';
    const vendorName = row.vendor?.name?.trim() || '商品';
    const existing = byVendor.get(vendorId);

    if (existing) {
      existing.lines.push(line);
      existing.itemsSubtotal += Math.round(line.unitPrice * line.qty);
      continue;
    }

    byVendor.set(vendorId, {
      vendorId,
      vendorName,
      selectedShippingMethodLabel: null,
      itemsSubtotal: Math.round(line.unitPrice * line.qty),
      effectiveShipping: 0,
      gapToFreeShipping: null,
      lines: [line],
    });
  }

  const vendors = Array.from(byVendor.values()).sort((a, b) =>
    a.vendorName.localeCompare(b.vendorName, 'zh-Hant'),
  );
  const itemsSubtotal = vendors.reduce((sum, v) => sum + v.itemsSubtotal, 0);
  const shippingTotal = Math.max(0, Math.round(orderTotal) - itemsSubtotal);

  if (vendors.length === 1 && shippingTotal > 0) {
    vendors[0]!.effectiveShipping = shippingTotal;
  }

  return {
    vendors,
    itemsSubtotal,
    shippingTotal,
    grandTotal: Math.round(orderTotal),
  };
}

export function parseMemberOrderBreakdownItems(
  rows: unknown[],
): MemberOrderBreakdownItemInput[] {
  const out: MemberOrderBreakdownItemInput[] = [];

  for (const raw of rows) {
    if (raw == null || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.variant_id !== 'string') continue;

    const variantRaw = row.variant;
    let variant: MemberOrderBreakdownItemInput['variant'] = null;
    if (variantRaw != null && typeof variantRaw === 'object' && !Array.isArray(variantRaw)) {
      const v = variantRaw as Record<string, unknown>;
      const productRaw = v.product;
      let product: { name?: string | null; image_url?: string | null } | null = null;
      if (productRaw != null && typeof productRaw === 'object' && !Array.isArray(productRaw)) {
        const p = productRaw as Record<string, unknown>;
        product = {
          name: typeof p.name === 'string' ? p.name : null,
          image_url: typeof p.image_url === 'string' ? p.image_url : null,
        };
      }
      variant = {
        label: typeof v.label === 'string' ? v.label : null,
        product,
      };
    }

    const vendorRaw = row.vendor;
    let vendor: MemberOrderBreakdownItemInput['vendor'] = null;
    if (vendorRaw != null && typeof vendorRaw === 'object' && !Array.isArray(vendorRaw)) {
      const v = vendorRaw as Record<string, unknown>;
      vendor = {
        name: typeof v.name === 'string' ? v.name : null,
      };
    }

    out.push({
      id: row.id,
      qty: typeof row.qty === 'number' ? row.qty : Number(row.qty) || 0,
      unit_price:
        typeof row.unit_price === 'number' ?
          row.unit_price
        : Number(row.unit_price) || 0,
      variant_id: row.variant_id,
      vendor_id: typeof row.vendor_id === 'string' ? row.vendor_id : null,
      variant,
      vendor,
    });
  }

  return out;
}

export function buildMemberOrderPaymentBreakdown(input: {
  checkoutSnapshot: unknown;
  items: MemberOrderBreakdownItemInput[];
  orderTotal: number;
}): MemberOrderPaymentBreakdown {
  const fromSnapshot = buildFromSnapshot(
    input.checkoutSnapshot,
    input.items,
    input.orderTotal,
  );
  if (fromSnapshot) return fromSnapshot;
  return buildFromOrderItems(input.items, input.orderTotal);
}
