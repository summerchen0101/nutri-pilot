'use client';

import Link from 'next/link';
import { Sparkles, Store } from 'lucide-react';

import { ShopCategoryBanner } from '@/app/(main)/shop/_components/shop-category-banner';
import type { ShopHomeBannerSlide } from '@/app/(main)/shop/_components/shop-home-banner-carousel';
import { ShopCatalogProductGrid } from '@/app/(main)/shop/_components/shop-catalog-product-grid';
import { SectionHeading } from '@/components/ui/section-heading';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface ShopProductRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category: string;
  calories: number;
  protein_g: number;
  sugar_g: number | null;
  diet_tags: string[] | null;
  cert_tags: string[] | null;
  avg_rating: number | null;
  score: number;
  sort_order: number;
  brand: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    vendor: {
      id: string;
      name: string;
      shipping_fee: number;
      free_shipping_threshold: number | null;
      lead_time_days: number;
    };
  } | null;
  variants: Array<{
    id: string;
    label: string;
    price: number;
    stock: number | null;
    list_price: number | null;
  }>;
}

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  productCount: number;
}

interface Props {
  initialProducts: ShopProductRow[];
  initialFavoriteProductIds: string[];
  brands: BrandRow[];
  dietMethod: string;
  usePersonalizedScores?: boolean;
  categoryBannersBySlug: Record<string, ShopHomeBannerSlide | null>;
}

export function ShopHomeClient({
  initialProducts,
  initialFavoriteProductIds,
  brands,
  dietMethod,
  usePersonalizedScores = true,
  categoryBannersBySlug,
}: Props) {
  return (
    <div className="space-y-5">
      <ShopCategoryBanner bannersBySlug={categoryBannersBySlug} />
      <section>
        <SectionHeading icon={Sparkles}>為你推薦</SectionHeading>
        {!usePersonalizedScores ?
          <p className="mt-1 text-caption text-muted-foreground">
            個人化排序已關閉，將依篩選側欄所選方式排序。
          </p>
        : null}
        <div className="mt-3">
          <ShopCatalogProductGrid
            initialProducts={initialProducts}
            initialFavoriteProductIds={initialFavoriteProductIds}
            dietMethod={dietMethod}
            usePersonalizedScores={usePersonalizedScores}
          />
        </div>
      </section>

      <section>
        <SectionHeading icon={Store}>精選品牌</SectionHeading>
        <div className="hide-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {brands
            .filter((b) => b.productCount > 0)
            .map((b) => (
              <div
                key={b.id}
                className="min-w-[140px] shrink-0 rounded-xl bg-card p-3"
              >
                <p className="text-body font-medium text-foreground">
                  {b.name}
                </p>
                <p className="mt-1 text-caption tabular-nums text-muted-foreground">
                  {formatShopGroupedInteger(b.productCount)} 件商品
                </p>
                <Link
                  href="/shop"
                  className="mt-2 inline-block text-caption font-medium text-primary"
                >
                  查看商城
                </Link>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
