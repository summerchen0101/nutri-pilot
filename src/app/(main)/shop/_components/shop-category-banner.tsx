'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { ShopHomeBannerSlide } from '@/app/(main)/shop/_components/shop-home-banner-carousel';
import { SHOP_ALL_CATEGORY } from '@/lib/shop/constants';
import { useShopCatalogUiStore } from '@/lib/shop/shop-catalog-ui-store';

export function ShopCategoryBanner({
  bannersBySlug,
}: Readonly<{
  bannersBySlug: Record<string, ShopHomeBannerSlide | null>;
}>) {
  const category = useShopCatalogUiStore((s) => s.category);

  if (category === SHOP_ALL_CATEGORY) {
    return null;
  }

  const data = bannersBySlug[category];
  if (!data) {
    return null;
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

  return (
    <section aria-label="分類活動">
      {data.href ?
        <Link href={data.href} className="block transition-opacity hover:opacity-95">
          {cardInner}
        </Link>
      : cardInner}
    </section>
  );
}
