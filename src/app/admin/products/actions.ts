'use server';

import { revalidatePath } from 'next/cache';

import type { ProductSavePayload, VariantSaveLine } from '@/app/admin/products/types';
import { getAdminRole, staffCan } from '@/lib/admin';
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from '@/lib/admin/product-taxonomy';
import { createClient } from '@/lib/supabase/server';
import { makeUniqueSlugBase } from '@/utils/admin-slug';

function validateCategory(cat: string): cat is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(cat);
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

export async function saveProduct(
  payload: ProductSavePayload,
): Promise<{ ok: false; error: string } | { ok: true; id: string }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'product.edit')) {
    return { ok: false, error: '沒有權限' };
  }

  if (!validateCategory(payload.category)) {
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

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${payload.id}`);
    return { ok: true, id: payload.id };
  }

  const slug = makeUniqueSlugBase(payload.name);

  const { data: inserted, error: insErr } = await supabase
    .from('products')
    .insert({
      ...rowBase,
      slug,
      avg_rating: 0,
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

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${inserted.id}`);
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

  revalidatePath('/admin/products');
  return { ok: true };
}
