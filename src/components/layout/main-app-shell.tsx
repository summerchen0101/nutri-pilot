'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/layout/bottom-nav';
import { ShopBottomNav } from '@/components/layout/shop-bottom-nav';
import {
  isShopCommerceShortcutPathname,
  isShopProductDetailPathname,
  isShopRoutePathname,
  isShopSettingsHubPathname,
  shouldHideAllBottomNavPathname,
} from '@/lib/shop/shop-path';

function shouldUseCompactBottomPadding(pathname: string): boolean {
  if (pathname === '/dashboard') return true;
  if (pathname === '/guard' || pathname.startsWith('/guard/')) return true;
  if (isShopProductDetailPathname(pathname)) return true;
  if (isShopSettingsHubPathname(pathname)) return true;
  if (isShopCommerceShortcutPathname(pathname)) return true;
  return false;
}

export function MainAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shopProductDetail = isShopProductDetailPathname(pathname);
  const compactBottomPadding = shouldUseCompactBottomPadding(pathname);
  /** 商城樹與商城 commerce 捷徑頁皆以 StickyPageHeader Shell 自理 safe-area，避免頂緣多出全站 pt-5 */
  const topPadClass =
    isShopRoutePathname(pathname) || isShopCommerceShortcutPathname(pathname) ?
      'pt-0'
    : 'pt-5';
  const contentPaddingClass =
    shopProductDetail ?
      `mx-auto max-w-sm px-4 pb-8 ${topPadClass}`
    : compactBottomPadding ?
      `mx-auto max-w-sm px-4 pb-24 ${topPadClass}`
    : `mx-auto max-w-sm px-4 pb-28 ${topPadClass}`;
  const showShopBottomNav =
    isShopRoutePathname(pathname) &&
    !shouldHideAllBottomNavPathname(pathname);
  const showMainBottomNav =
    !isShopRoutePathname(pathname) && !isShopCommerceShortcutPathname(pathname);

  return (
    <div className="relative min-h-screen">
      <div className={contentPaddingClass}>
        {children}
      </div>
      {showShopBottomNav ?
        <ShopBottomNav />
      : showMainBottomNav ?
        <BottomNav />
      : null}
    </div>
  );
}
