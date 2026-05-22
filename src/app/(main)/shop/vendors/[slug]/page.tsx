import Link from 'next/link';
import { FiChevronLeft } from 'react-icons/fi';
import { notFound, redirect } from 'next/navigation';

import { mapSupabaseProductToShopRow } from '@/app/(main)/shop/map-shop-product-row';
import { ShopCartHeaderAction } from '@/app/(main)/shop/shop-cart-header-action';
import { ShopCatalogHeaderActions } from '@/app/(main)/shop/shop-catalog-header-actions';
import { ShopHeaderPointsTitle } from '@/app/(main)/shop/_components/shop-header-points-title';
import { ShopCatalogSearchButton } from '@/app/(main)/shop/_components/shop-header-share-search';
import { VendorShopClient } from '@/app/(main)/shop/vendors/_components/vendor-shop-client';
import { VendorShopHero } from '@/app/(main)/shop/vendors/_components/vendor-shop-hero';
import { ensureShopScores } from '@/app/(main)/shop/actions';
import { HEADER_LEADING_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';
import { SHOP_CATALOG_PRODUCT_SELECT } from '@/lib/shop/shop-catalog-select';
import { cn } from '@/lib/utils/cn';
import { getCachedAuthContext } from '@/lib/auth';
import { getCachedUserProfileCoreRow } from '@/lib/user-profile';

interface PageProps {
  params: { slug: string };
}

export default async function VendorShopPage({ params }: PageProps) {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const slug = params.slug.trim();
  if (!slug) notFound();

  const { data: vendor, error: vendorErr } = await supabase
    .from('vendors')
    .select(
      'id, name, slug, description, banner_url, logo_url, shipping_fee, free_shipping_threshold, lead_time_days',
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (vendorErr || !vendor) notFound();

  await ensureShopScores(user.id);

  const [
    { data: profile, error: profileErr },
    { data: goal },
    { data: brandRows },
    { data: pointsRow },
  ] = await Promise.all([
    getCachedUserProfileCoreRow(supabase, user.id),
    supabase
      .from('user_goals')
      .select('type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('brands')
      .select('id')
      .eq('vendor_id', vendor.id)
      .eq('is_active', true),
    supabase
      .from('user_profiles')
      .select('shop_points_balance')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (profileErr || !profile || !goal || !profile.diet_method) {
    redirect('/onboarding');
  }

  const brandIds = (brandRows ?? []).map((b) => b.id as string);

  const [{ data: catalog }, { data: scores }, { data: favoriteRows }] =
    await Promise.all([
      brandIds.length > 0 ?
        supabase
          .from('products')
          .select(SHOP_CATALOG_PRODUCT_SELECT)
          .eq('is_active', true)
          .in('brand_id', brandIds)
      : Promise.resolve({ data: [], error: null }),
      supabase
        .from('user_product_scores')
        .select('product_id, score')
        .eq('user_id', user.id),
      supabase
        .from('user_product_favorites')
        .select('product_id')
        .eq('user_id', user.id),
    ]);

  const scoreMap = new Map(
    (scores ?? []).map((s) => [s.product_id as string, Number(s.score)]),
  );

  const favoriteProductIds = (favoriteRows ?? []).map(
    (r) => r.product_id as string,
  );

  const shopPointsBalance = Math.max(
    0,
    Math.floor(Number(pointsRow?.shop_points_balance ?? 0)),
  );

  const backLink = (
    <Link
      href="/shop"
      aria-label="返回商城"
      className={HEADER_LEADING_ICON_CLASS}
    >
      <FiChevronLeft className="h-[18px] w-[18px]" aria-hidden />
    </Link>
  );

  return (
    <div className="space-y-4">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        leading={backLink}
        title="健康商城"
        spacing="compact"
        shellClassName="bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90"
        titleSlot={<ShopHeaderPointsTitle balance={shopPointsBalance} />}
        action={
          <div className="flex shrink-0 items-center justify-end gap-1">
            <div
              className={cn(
                'hide-scrollbar flex min-w-0 max-w-[min(100%,72vw)] items-center gap-1 overflow-x-auto sm:max-w-none',
              )}
            >
              <ShopCatalogSearchButton />
              <ShopCatalogHeaderActions />
            </div>
            <ShopCartHeaderAction />
          </div>
        }
      />

      <VendorShopHero
        name={vendor.name}
        description={vendor.description}
        bannerUrl={vendor.banner_url}
        logoUrl={vendor.logo_url}
        shippingFee={Number(vendor.shipping_fee)}
        freeShippingThreshold={
          vendor.free_shipping_threshold == null ?
            null
          : Number(vendor.free_shipping_threshold)
        }
        leadTimeDays={Number(vendor.lead_time_days ?? 3)}
      />

      <VendorShopClient
        vendorName={vendor.name}
        initialProducts={(catalog ?? []).map((p) =>
          mapSupabaseProductToShopRow(
            p as Record<string, unknown>,
            scoreMap.get(p.id as string) ?? 0,
          ),
        )}
        initialFavoriteProductIds={favoriteProductIds}
        dietMethod={profile.diet_method}
        usePersonalizedScores={profile.shop_personalize_recommendations !== false}
      />
    </div>
  );
}
