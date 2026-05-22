import {
  ShopHomeBannerCarousel,
  type ShopHomeBannerSlide,
} from '@/app/(main)/shop/_components/shop-home-banner-carousel';
import { getCachedAuthContext } from '@/lib/auth';

function ShopHomeBannerFallback() {
  return (
    <section
      className="overflow-hidden rounded-xl bg-primary-light px-6 py-8 text-center"
      aria-label="商城活動"
    >
      <p className="text-heading-section text-[#2D6B4A]">
        為你的健康計畫精選好物
      </p>
      <p className="mt-2 text-caption text-[#2D6B4A]/85">
        依飲食偏好與目標排序，安心選購。
      </p>
    </section>
  );
}

export async function ShopHomeBanner() {
  const { supabase } = await getCachedAuthContext();

  const { data, error } = await supabase
    .from('shop_home_banners')
    .select('title, subtitle, image_url, href')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || data == null || data.length === 0) {
    return <ShopHomeBannerFallback />;
  }

  const slides: ShopHomeBannerSlide[] = data.map((row) => ({
    title: row.title,
    subtitle: row.subtitle,
    image_url: row.image_url,
    href: row.href,
  }));

  return <ShopHomeBannerCarousel slides={slides} />;
}
