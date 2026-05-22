import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export async function getProductEditorCategories(
  supabase: SupabaseClient<Database>,
  options?: { includeSlug?: string },
): Promise<Array<{ slug: string; label: string }>> {
  const { data, error } = await supabase
    .from('shop_categories')
    .select('slug, label, is_active')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const includeSlug = options?.includeSlug;
  return (data ?? [])
    .filter((row) => row.is_active || row.slug === includeSlug)
    .map((row) => ({ slug: row.slug, label: row.label }));
}
