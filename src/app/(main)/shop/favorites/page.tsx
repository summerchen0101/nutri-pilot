import Link from 'next/link';
import { FiChevronLeft } from 'react-icons/fi';
import { redirect } from 'next/navigation';

import { ShopCartHeaderAction } from '@/app/(main)/shop/shop-cart-header-action';
import { ShopFavoritesView } from '@/app/(main)/shop/favorites/shop-favorites-view';
import type { ShopProductRow } from '@/app/(main)/shop/shop-home-client';
import { HEADER_LEADING_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';
import { cn } from '@/lib/utils/cn';
import { getCachedAuthContext } from '@/lib/auth';
import { getCachedUserProfileCoreRow } from '@/lib/user-profile';

const CATALOG_PRODUCT_SELECT = `
  id,
  name,
  slug,
  image_url,
  category,
  calories,
  protein_g,
  sugar_g,
  diet_tags,
  cert_tags,
  avg_rating,
  brand:brands ( id, name, slug, logo_url ),
  variants:product_variants ( id, label, price, stock )
`;

export default async function ShopFavoritesPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const [{ data: profile, error: profileErr }, { data: goal }] =
    await Promise.all([
      getCachedUserProfileCoreRow(supabase, user.id),
      supabase
        .from('user_goals')
        .select('type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

  if (profileErr || !profile || !goal || !profile.diet_method) {
    redirect('/onboarding');
  }

  const { data: favRows, error: favErr } = await supabase
    .from('user_product_favorites')
    .select('product_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (favErr) {
    throw new Error(favErr.message);
  }

  const backLink = (
    <Link
      href="/shop"
      aria-label="返回商城"
      className={HEADER_LEADING_ICON_CLASS}
    >
      <FiChevronLeft className="h-[18px] w-[18px]" aria-hidden />
    </Link>
  );

  if (!favRows?.length) {
    return (
      <div className="space-y-4">
        <StickyPageHeader
          anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
          leading={backLink}
          title="我的最愛"
          spacing="compact"
          action={<ShopCartHeaderAction />}
        />
        <div className="rounded-xl border-hairline border-border bg-card p-6 text-center">
          <p className="text-body text-muted-foreground">尚無收藏商品</p>
          <Link
            href="/shop"
            className={cn(
              'mt-4 inline-flex min-h-11 items-center justify-center rounded-[10px] px-[18px] py-[11px] text-body font-medium',
              'bg-[#1E212B] text-white hover:bg-[#2A2F3D]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E212B]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            去逛逛商城
          </Link>
        </div>
      </div>
    );
  }

  const ids = favRows.map((r) => r.product_id as string);

  const [{ data: catalog }, { data: scores }] = await Promise.all([
    supabase
      .from('products')
      .select(CATALOG_PRODUCT_SELECT)
      .in('id', ids)
      .eq('is_active', true),
    supabase
      .from('user_product_scores')
      .select('product_id, score')
      .eq('user_id', user.id)
      .in('product_id', ids),
  ]);

  const scoreMap = new Map(
    (scores ?? []).map((s) => [s.product_id as string, Number(s.score)]),
  );
  const productById = new Map(
    (catalog ?? []).map((p) => [p.id as string, p]),
  );

  const ordered: ShopProductRow[] = [];
  for (const row of favRows) {
    const pid = row.product_id as string;
    const rowProduct = productById.get(pid);
    if (!rowProduct) continue;
    ordered.push({
      ...(rowProduct as unknown as Omit<ShopProductRow, 'score'>),
      score: scoreMap.get(pid) ?? 0,
    });
  }

  return (
    <div className="space-y-4">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        leading={backLink}
        title="我的最愛"
        spacing="compact"
        action={<ShopCartHeaderAction />}
      />
      {ordered.length === 0 ?
        <div className="rounded-xl border-hairline border-border bg-card p-6 text-center">
          <p className="text-body text-muted-foreground">
            收藏的商品已下架或無法顯示
          </p>
          <Link
            href="/shop"
            className={cn(
              'mt-4 inline-flex min-h-11 items-center justify-center rounded-[10px] px-[18px] py-[11px] text-body font-medium',
              'bg-[#1E212B] text-white hover:bg-[#2A2F3D]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E212B]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            返回商城
          </Link>
        </div>
      : <ShopFavoritesView initialProducts={ordered} />}
    </div>
  );
}
