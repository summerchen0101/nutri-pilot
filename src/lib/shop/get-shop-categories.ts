import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type ShopCategoryRow = {
  slug: string;
  label: string;
  sort_order: number;
  icon_key: string | null;
};

export async function getActiveShopCategories(
  supabase: SupabaseClient<Database>,
): Promise<ShopCategoryRow[]> {
  const { data, error } = await supabase
    .from('shop_categories')
    .select('slug, label, sort_order, icon_key')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    slug: row.slug,
    label: row.label,
    sort_order: row.sort_order,
    icon_key: row.icon_key,
  }));
}

export async function getAllShopCategoriesForAdmin(
  supabase: SupabaseClient<Database>,
): Promise<
  Array<
    ShopCategoryRow & {
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }
  >
> {
  const { data, error } = await supabase
    .from('shop_categories')
    .select('slug, label, sort_order, icon_key, is_active, created_at, updated_at')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    slug: row.slug,
    label: row.label,
    sort_order: row.sort_order,
    icon_key: row.icon_key,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export function buildShopCategoryLabelMap(
  categories: ShopCategoryRow[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of categories) {
    map[c.slug] = c.label;
  }
  return map;
}
