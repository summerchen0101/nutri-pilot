'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/layout/bottom-nav';
import { ShopBottomNav } from '@/components/layout/shop-bottom-nav';
import {
  isShopProductDetailPathname,
  isShopRoutePathname,
} from '@/lib/shop/shop-path';

function shouldUseCompactBottomPadding(pathname: string): boolean {
  if (pathname === '/dashboard') return true;
  if (pathname === '/guard' || pathname.startsWith('/guard/')) return true;
  if (isShopProductDetailPathname(pathname)) return true;
  return false;
}

export function MainAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shopProductDetail = isShopProductDetailPathname(pathname);
  const compactBottomPadding = shouldUseCompactBottomPadding(pathname);
  /** 商城樹皆以 StickyPageHeader Shell 自理 safe-area，避免頂緣多出全站 pt-5 */
  const topPadClass =
    isShopRoutePathname(pathname) ? 'pt-0' : 'pt-5';
  const contentPaddingClass =
    shopProductDetail ?
      `mx-auto max-w-sm px-4 pb-8 ${topPadClass}`
    : compactBottomPadding ?
      `mx-auto max-w-sm px-4 pb-24 ${topPadClass}`
    : `mx-auto max-w-sm px-4 pb-28 ${topPadClass}`;
  const showShopBottomNav =
    isShopRoutePathname(pathname) && !shopProductDetail;

  return (
    <div className="relative min-h-screen">
      <div className={contentPaddingClass}>
        {children}
      </div>
      {showShopBottomNav ?
        <ShopBottomNav />
      : !isShopRoutePathname(pathname) ?
        <BottomNav />
      : null}
    </div>
  );
}
