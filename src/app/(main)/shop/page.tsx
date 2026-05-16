import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { ShopCatalogBody } from '@/app/(main)/shop/shop-catalog-body';
import { ShopHomeBanner } from '@/app/(main)/shop/shop-home-banner';
import {
  ShopBannerSkeleton,
  ShopHomeSkeleton,
} from '@/app/(main)/shop/shop-home-skeleton';
import { ShopPageHeader } from '@/app/(main)/shop/shop-page-header';
import { getCachedAuthContext } from '@/lib/auth';

export default async function ShopPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  return (
    <div className="space-y-4">
      <ShopPageHeader />
      <Suspense fallback={<ShopBannerSkeleton />}>
        <ShopHomeBanner />
      </Suspense>
      <Suspense fallback={<ShopHomeSkeleton />}>
        <ShopCatalogBody />
      </Suspense>
    </div>
  );
}
