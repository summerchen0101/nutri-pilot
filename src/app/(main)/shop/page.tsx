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
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const { data: pointsRow } = await supabase
    .from('user_profiles')
    .select('shop_points_balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const shopPointsBalance = Number(pointsRow?.shop_points_balance ?? 0);

  return (
    <div className="space-y-4">
      <ShopPageHeader shopPointsBalance={shopPointsBalance} />
      <Suspense fallback={<ShopBannerSkeleton />}>
        <ShopHomeBanner />
      </Suspense>
      <Suspense fallback={<ShopHomeSkeleton />}>
        <ShopCatalogBody />
      </Suspense>
    </div>
  );
}
