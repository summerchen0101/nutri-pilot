import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export async function shopCategorySlugExists(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('shop_categories')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data != null;
}
