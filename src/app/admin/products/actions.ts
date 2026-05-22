'use server';

import { revalidatePath } from 'next/cache';

import type { ProductSavePayload, VariantSaveLine } from '@/app/admin/products/types';
import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_TYPES,
} from '@/lib/admin/admin-audit-actions';
import { appendAdminAuditLog } from '@/lib/admin/append-admin-audit-log';
import { getAdminRole, staffCan } from '@/lib/admin';
import { shopCategorySlugExists } from '@/lib/shop/validate-shop-category';
import { createClient } from '@/lib/supabase/server';
import { makeUniqueSlugBase } from '@/utils/admin-slug';

async function validateCategory(
  cat: string,
): Promise<boolean> {
  const supabase = createClient();
  return shopCategorySlugExists(supabase, cat);
}

async function syncVariants(
  productId: string,
  variants: VariantSaveLine[],
): Promise<{ ok: false; error: string } | { ok: true }> {
  const supabase = createClient();

  const { data: existingRows, error: exErr } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);

  if (exErr) {
    return { ok: false, error: exErr.message };
  }

  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  const keptIds = new Set(
    variants.map((v) => v.id).filter((id): id is string => Boolean(id)),
  );

  for (const line of variants) {
    if (line.id) {
      const { error } = await supabase
        .from('product_variants')
        .update({
          label: line.label,
          weight_g: line.weight_g,
          price: line.price,
          list_price: line.list_price,
          stock: line.stock,
        })
        .eq('id', line.id)
        .eq('product_id', productId);

      if (error) {
        return { ok: false, error: error.message };
      }
    } else {
      const { error } = await supabase.from('product_variants').insert({
        product_id: productId,
        label: line.label,
        weight_g: line.weight_g,
        price: line.price,
        list_price: line.list_price,
        stock: line.stock,
      });

      if (error) {
        return { ok: false, error: error.message };
      }
    }
  }

  for (const oldId of Array.from(existingIds)) {
    if (keptIds.has(oldId)) {
      continue;
    }

    const { count, error: cErr } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('variant_id', oldId);

    if (cErr) {
      return { ok: false, error: cErr.message };
    }

    if (count !== null && count > 0) {
      continue;
    }

    const { error: delErr } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', oldId)
      .eq('product_id', productId);

    if (delErr) {
      return { ok: false, error: delErr.message };
    }
  }

  return { ok: true };
}

async function nextProductSortOrder(
  supabase: ReturnType<typeof createClient>,
): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.sort_order ?? -1) + 1;
}

export async function reorderProducts(
  orderedIds: string[],
): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'product.edit')) {
    return { ok: false, error: '沒有權限' };
  }

  if (orderedIds.length === 0) {
    return { ok: true };
  }

  const supabase = createClient();

  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    const { error } = await supabase
      .from('products')
      .update({ sort_order: index })
      .eq('id', id);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.PRODUCT_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.PRODUCT,
    targetId: orderedIds[0],
    metadata: { reorder: true, count: orderedIds.length },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog product.reorder:', audit.error);
  }

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function saveProduct(
  payload: ProductSavePayload,
): Promise<{ ok: false; error: string } | { ok: true; id: string }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'product.edit')) {
    return { ok: false, error: '沒有權限' };
  }

  if (!(await validateCategory(payload.category))) {
    return { ok: false, error: '無效的商品分類' };
  }

  if (payload.variants.length === 0) {
    return { ok: false, error: '至少需要一個規格' };
  }

  const supabase = createClient();

  const rowBase = {
    name: payload.name.trim(),
    brand_id: payload.brand_id,
    category: payload.category,
    description: payload.description,
    image_url: payload.image_url,
    serving_size_g: payload.serving_size_g,
    calories: payload.calories,
    carb_g: payload.carb_g,
    protein_g: payload.protein_g,
    fat_g: payload.fat_g,
    fiber_g: payload.fiber_g,
    sugar_g: payload.sugar_g,
    sodium_mg: payload.sodium_mg,
    diet_tags: payload.diet_tags,
    cert_tags: payload.cert_tags,
    allergen_free: payload.allergen_free,
    ingredients: payload.ingredients,
    origin: payload.origin,
    is_active: payload.is_active,
  };

  if (payload.id) {
    const { error } = await supabase
      .from('products')
      .update(rowBase)
      .eq('id', payload.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    const synced = await syncVariants(payload.id, payload.variants);
    if (!synced.ok) {
      return synced;
    }

    const audit = await appendAdminAuditLog({
      action: ADMIN_AUDIT_ACTIONS.PRODUCT_SAVE,
      targetType: ADMIN_AUDIT_TARGET_TYPES.PRODUCT,
      targetId: payload.id,
      metadata: { was_create: false },
    });
    if (!audit.ok) {
      console.error('appendAdminAuditLog product.save:', audit.error);
    }

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${payload.id}`);
    revalidatePath('/shop');
    revalidatePath('/dashboard');
    return { ok: true, id: payload.id };
  }

  const slug = makeUniqueSlugBase(payload.name);
  const sortOrder = await nextProductSortOrder(supabase);

  const { data: inserted, error: insErr } = await supabase
    .from('products')
    .insert({
      ...rowBase,
      slug,
      avg_rating: 0,
      sort_order: sortOrder,
    })
    .select('id')
    .single();

  if (insErr || !inserted?.id) {
    return { ok: false, error: insErr?.message ?? '建立失敗' };
  }

  const synced = await syncVariants(inserted.id, payload.variants);
  if (!synced.ok) {
    return synced;
  }

  const auditCreated = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.PRODUCT_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.PRODUCT,
    targetId: inserted.id,
    metadata: { was_create: true },
  });
  if (!auditCreated.ok) {
    console.error('appendAdminAuditLog product.save:', auditCreated.error);
  }

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${inserted.id}`);
  revalidatePath('/shop');
  revalidatePath('/dashboard');
  return { ok: true, id: inserted.id };
}

export async function updateProductImageUrl(
  productId: string,
  imageUrl: string,
): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'product.edit')) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('products')
    .update({ image_url: imageUrl })
    .eq('id', productId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const auditImg = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.PRODUCT_IMAGE_UPDATE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.PRODUCT,
    targetId: productId,
    metadata: {},
  });
  if (!auditImg.ok) {
    console.error(
      'appendAdminAuditLog product.image_update:',
      auditImg.error,
    );
  }

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}

export async function deleteProduct(
  productId: string,
): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'product.delete')) {
    return { ok: false, error: '僅超級管理員可刪除商品' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('products').delete().eq('id', productId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.PRODUCT_DELETE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.PRODUCT,
    targetId: productId,
    metadata: {},
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog product.delete:', audit.error);
  }

  revalidatePath('/admin/products');
  return { ok: true };
}

