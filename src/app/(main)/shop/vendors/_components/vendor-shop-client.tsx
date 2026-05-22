'use client';

import { Sparkles } from 'lucide-react';

import { ShopCatalogProductGrid } from '@/app/(main)/shop/_components/shop-catalog-product-grid';
import { VendorShopScrollDock } from '@/app/(main)/shop/vendors/_components/vendor-shop-scroll-dock';
import type { ShopProductRow } from '@/app/(main)/shop/shop-home-client';
import { SectionHeading } from '@/components/ui/section-heading';

interface VendorShopClientProps {
  vendorName: string;
  initialProducts: ShopProductRow[];
  initialFavoriteProductIds: string[];
  dietMethod: string;
  usePersonalizedScores?: boolean;
}

export function VendorShopClient({
  vendorName,
  initialProducts,
  initialFavoriteProductIds,
  dietMethod,
  usePersonalizedScores = true,
}: VendorShopClientProps) {
  return (
    <div className="space-y-4">
      <VendorShopScrollDock vendorName={vendorName} />
      <section>
        <SectionHeading icon={Sparkles}>商品</SectionHeading>
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
            emptyMessage="此廠商暫無符合條件的商品。"
          />
        </div>
      </section>
    </div>
  );
}
