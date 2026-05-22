'use server';

import { revalidatePath } from 'next/cache';

import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_TYPES,
} from '@/lib/admin/admin-audit-actions';
import { appendAdminAuditLog } from '@/lib/admin/append-admin-audit-log';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { isShopCategoryIconKey } from '@/lib/shop/shop-category-icon-keys';

const CATEGORY_SLUG_RE = /^[a-z][a-z0-9_]*$/;

export async function saveShopHomeBanner(input: {
  id?: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  href?: string | null;
  sortOrder: number;
  isActive: boolean;
}): Promise<{ ok: false; error: string } | { ok: true; id: string }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    return { ok: false, error: '沒有權限' };
  }

  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: '請填標題' };
  }

  const supabase = createClient();
  const row = {
    title,
    subtitle: input.subtitle?.trim() || null,
    image_url: input.imageUrl?.trim() || null,
    href: input.href?.trim() || null,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  };

  if (input.id) {
    const { error } = await supabase
      .from('shop_home_banners')
      .update(row)
      .eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    await appendAdminAuditLog({
      action: ADMIN_AUDIT_ACTIONS.SHOP_HOME_BANNER_SAVE,
      targetType: ADMIN_AUDIT_TARGET_TYPES.SHOP_HOME_BANNER,
      targetId: input.id,
    });
    revalidateShopPaths();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from('shop_home_banners')
    .insert(row)
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? '建立失敗' };
  }
  await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.SHOP_HOME_BANNER_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.SHOP_HOME_BANNER,
    targetId: data.id,
  });
  revalidateShopPaths();
  return { ok: true, id: data.id };
}

export async function deleteShopHomeBanner(input: {
  id: string;
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.delete')) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('shop_home_banners')
    .delete()
    .eq('id', input.id);
  if (error) return { ok: false, error: error.message };

  await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.SHOP_HOME_BANNER_DELETE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.SHOP_HOME_BANNER,
    targetId: input.id,
  });
  revalidateShopPaths();
  return { ok: true };
}

export async function saveShopCategoryBanner(input: {
  id?: string;
  categorySlug: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  href?: string | null;
  sortOrder: number;
  isActive: boolean;
}): Promise<{ ok: false; error: string } | { ok: true; id: string }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    return { ok: false, error: '沒有權限' };
  }

  const categorySlug = input.categorySlug.trim();
  const title = input.title.trim();
  if (!categorySlug) return { ok: false, error: '請選擇分類' };
  if (!title) return { ok: false, error: '請填標題' };

  const supabase = createClient();
  const row = {
    category_slug: categorySlug,
    title,
    subtitle: input.subtitle?.trim() || null,
    image_url: input.imageUrl?.trim() || null,
    href: input.href?.trim() || null,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  };

  if (input.id) {
    const { error } = await supabase
      .from('shop_category_banners')
      .update(row)
      .eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    await appendAdminAuditLog({
      action: ADMIN_AUDIT_ACTIONS.SHOP_CATEGORY_BANNER_SAVE,
      targetType: ADMIN_AUDIT_TARGET_TYPES.SHOP_CATEGORY_BANNER,
      targetId: input.id,
      metadata: { categorySlug },
    });
    revalidateShopPaths();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from('shop_category_banners')
    .insert(row)
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? '建立失敗' };
  }
  await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.SHOP_CATEGORY_BANNER_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.SHOP_CATEGORY_BANNER,
    targetId: data.id,
    metadata: { categorySlug },
  });
  revalidateShopPaths();
  return { ok: true, id: data.id };
}

export async function deleteShopCategoryBanner(input: {
  id: string;
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.delete')) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('shop_category_banners')
    .delete()
    .eq('id', input.id);
  if (error) return { ok: false, error: error.message };

  await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.SHOP_CATEGORY_BANNER_DELETE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.SHOP_CATEGORY_BANNER,
    targetId: input.id,
  });
  revalidateShopPaths();
  return { ok: true };
}

function normalizeIconKey(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return isShopCategoryIconKey(t) ? t : null;
}

export async function createShopCategory(input: {
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  iconKey?: string | null;
}): Promise<{ ok: false; error: string } | { ok: true; slug: string }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    return { ok: false, error: '沒有權限' };
  }

  const slug = input.slug.trim();
  const label = input.label.trim();
  if (!CATEGORY_SLUG_RE.test(slug)) {
    return {
      ok: false,
      error: 'slug 須為小寫英數與底線，且以字母開頭',
    };
  }
  if (!label) return { ok: false, error: '請填顯示名稱' };

  const supabase = createClient();
  const { error } = await supabase.from('shop_categories').insert({
    slug,
    label,
    sort_order: input.sortOrder,
    is_active: input.isActive,
    icon_key: normalizeIconKey(input.iconKey),
  });
  if (error) return { ok: false, error: error.message };

  await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.SHOP_CATEGORY_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.SHOP_CATEGORY,
    targetId: slug,
  });
  revalidateShopPaths();
  return { ok: true, slug };
}

export async function saveShopCategory(input: {
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  iconKey?: string | null;
}): Promise<{ ok: false; error: string } | { ok: true; slug: string }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    return { ok: false, error: '沒有權限' };
  }

  const label = input.label.trim();
  if (!label) return { ok: false, error: '請填顯示名稱' };

  const supabase = createClient();
  const { error } = await supabase
    .from('shop_categories')
    .update({
      label,
      sort_order: input.sortOrder,
      is_active: input.isActive,
      icon_key: normalizeIconKey(input.iconKey),
    })
    .eq('slug', input.slug);
  if (error) return { ok: false, error: error.message };

  await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.SHOP_CATEGORY_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.SHOP_CATEGORY,
    targetId: input.slug,
  });
  revalidateShopPaths();
  return { ok: true, slug: input.slug };
}

export async function deleteShopCategory(input: {
  slug: string;
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.delete')) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();
  const { count, error: countErr } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category', input.slug);
  if (countErr) return { ok: false, error: countErr.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `仍有 ${count} 件商品使用此分類，請先變更商品分類後再刪除`,
    };
  }

  const { error } = await supabase
    .from('shop_categories')
    .delete()
    .eq('slug', input.slug);
  if (error) return { ok: false, error: error.message };

  await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.SHOP_CATEGORY_DELETE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.SHOP_CATEGORY,
    targetId: input.slug,
  });
  revalidateShopPaths();
  return { ok: true };
}

export type VendorShippingMethodInput = {
  id: string;
  label: string;
  shippingFee: number;
  freeShippingThreshold: number | null;
  isActive: boolean;
  sortOrder: number;
};

export async function saveVendorShippingMethods(input: {
  vendorId: string;
  methods: VendorShippingMethodInput[];
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'vendor.write')) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();

  for (const m of input.methods) {
    const label = m.label.trim();
    if (!label) return { ok: false, error: '運送方式名稱不可為空' };
    if (m.shippingFee < 0) return { ok: false, error: '運費不可為負' };
    if (
      m.freeShippingThreshold != null &&
      m.freeShippingThreshold < 0
    ) {
      return { ok: false, error: '免運門檻不可為負' };
    }

    const { error } = await supabase
      .from('vendor_shipping_methods')
      .update({
        label,
        shipping_fee: m.shippingFee,
        free_shipping_threshold: m.freeShippingThreshold,
        is_active: m.isActive,
        sort_order: m.sortOrder,
      })
      .eq('id', m.id)
      .eq('vendor_id', input.vendorId);

    if (error) return { ok: false, error: error.message };
  }

  const { data: homeRow } = await supabase
    .from('vendor_shipping_methods')
    .select('id, code, shipping_fee, free_shipping_threshold')
    .eq('vendor_id', input.vendorId)
    .eq('code', 'home_delivery')
    .maybeSingle();

  if (homeRow) {
    await supabase
      .from('vendors')
      .update({
        shipping_fee: Number(homeRow.shipping_fee),
        free_shipping_threshold: homeRow.free_shipping_threshold,
      })
      .eq('id', input.vendorId);
  }

  await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.VENDOR_SHIPPING_METHOD_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.VENDOR_SHIPPING_METHOD,
    targetId: input.vendorId,
    metadata: { count: input.methods.length },
  });

  revalidatePath('/admin/vendors');
  revalidatePath(`/admin/vendors/${input.vendorId}`);
  revalidatePath('/shop');
  revalidatePath('/shop/cart');
  return { ok: true };
}

function revalidateShopPaths() {
  revalidatePath('/admin/shop');
  revalidatePath('/admin/shop/banners');
  revalidatePath('/admin/shop/categories');
  revalidatePath('/shop');
}
