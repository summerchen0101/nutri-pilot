import type { SupabaseClient } from '@supabase/supabase-js';

import type { ShopHomeBannerSlide } from '@/app/(main)/shop/_components/shop-home-banner-carousel';
import type { Database } from '@/types/supabase';

/** 各分類 slug → 優先顯示的一則 active banner（sort_order 最小） */
export async function getActiveCategoryBannersBySlug(
  supabase: SupabaseClient<Database>,
): Promise<Record<string, ShopHomeBannerSlide | null>> {
  const { data, error } = await supabase
    .from('shop_category_banners')
    .select('category_slug, title, subtitle, image_url, href, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const map: Record<string, ShopHomeBannerSlide | null> = {};
  for (const row of data ?? []) {
    const slug = row.category_slug;
    if (map[slug]) continue;
    map[slug] = {
      title: row.title,
      subtitle: row.subtitle,
      image_url: row.image_url,
      href: row.href,
    };
  }
  return map;
}
