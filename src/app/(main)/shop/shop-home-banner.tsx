import Image from 'next/image';
import Link from 'next/link';

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
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || data == null) {
    return <ShopHomeBannerFallback />;
  }

  const cardInner = (
    <div className="relative overflow-hidden rounded-xl bg-primary-light">
      {data.image_url ?
        <div className="relative aspect-[3/1] w-full bg-muted">
          <Image
            src={data.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 440px"
            unoptimized
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 px-6 text-center">
            <p className="text-heading-section text-white">{data.title}</p>
            {data.subtitle ?
              <p className="mt-2 text-caption text-white/90">{data.subtitle}</p>
            : null}
          </div>
        </div>
      : <div className="px-6 py-8 text-center">
          <p className="text-heading-section text-[#2D6B4A]">{data.title}</p>
          {data.subtitle ?
            <p className="mt-2 text-caption text-[#2D6B4A]/85">{data.subtitle}</p>
          : null}
        </div>
      }
    </div>
  );

  if (data.href) {
    return (
      <section aria-label="商城活動">
        <Link href={data.href} className="block transition-opacity hover:opacity-95">
          {cardInner}
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="商城活動">
      {cardInner}
    </section>
  );
}
