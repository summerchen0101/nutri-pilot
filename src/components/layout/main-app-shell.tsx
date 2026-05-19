'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { PendingAnalysisJobsHost } from '@/components/ai/pending-analysis-jobs-host';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ShopBottomNav } from '@/components/layout/shop-bottom-nav';
import {
  isShopCheckoutFunnelPathname,
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
  const minimalBottomPadding =
    isShopProductDetailPathname(pathname) || isShopCheckoutFunnelPathname(pathname);
  const compactBottomPadding = shouldUseCompactBottomPadding(pathname);
  /** 全路由 pt-0；頂部 safe-area 由 StickyPageHeaderShell 或無頁首的 loading／skeleton 自理 */
  const contentPaddingClass =
    minimalBottomPadding ?
      'mx-auto w-full min-w-0 max-w-sm px-4 pb-8 pt-0'
    : compactBottomPadding ?
      'mx-auto w-full min-w-0 max-w-sm px-4 pb-24 pt-0'
    : 'mx-auto w-full min-w-0 max-w-sm px-4 pb-28 pt-0';
  const showShopBottomNav =
    (isShopRoutePathname(pathname) || isShopCommerceShortcutPathname(pathname)) &&
    !shouldHideAllBottomNavPathname(pathname);
  const showMainBottomNav =
    !isShopRoutePathname(pathname) && !isShopCommerceShortcutPathname(pathname);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <PendingAnalysisJobsHost />
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
