'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Heart, History, Home, LayoutGrid, Settings } from 'lucide-react';

import {
  isShopCatalogHomePathname,
} from '@/lib/shop/shop-path';
import { useShopCatalogUiStore } from '@/lib/shop/shop-catalog-ui-store';
import { cn } from '@/lib/utils/cn';

/** 捲動回頂附近時一律顯示主選單 */
const SCROLL_TOP_SHOW_NAV_PX = 40;
/** 判定「向下捲」的最小累積位移（px） */
const SCROLL_DOWN_DELTA_THRESHOLD = 6;

const navItemClass = (active: boolean) =>
  cn(
    'flex min-h-[44px] touch-manipulation cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium transition-colors duration-150 ease-out active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-1 focus-visible:ring-offset-primary',
    active ? 'bg-white/20 text-white' : 'text-white/70',
  );

export function ShopBottomNav() {
  const pathname = usePathname();
  const isCatalogHome = isShopCatalogHomePathname(pathname);
  const categoryPanelOpen = useShopCatalogUiStore((s) => s.categoryPanelOpen);
  const openCategoryPanel = useShopCatalogUiStore((s) => s.openCategoryPanel);

  const [hiddenByScrollDown, setHiddenByScrollDown] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!isCatalogHome) {
      setHiddenByScrollDown(false);
      return;
    }

    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;

    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastScrollYRef.current;
      const delta = y - prev;
      lastScrollYRef.current = y;

      if (y < SCROLL_TOP_SHOW_NAV_PX) {
        setHiddenByScrollDown(false);
        return;
      }

      if (delta > SCROLL_DOWN_DELTA_THRESHOLD) setHiddenByScrollDown(true);
      else if (delta < -SCROLL_DOWN_DELTA_THRESHOLD) {
        setHiddenByScrollDown(false);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [isCatalogHome]);

  const hideBar = isCatalogHome && hiddenByScrollDown;

  const categoryActive = isCatalogHome && categoryPanelOpen;
  const favoritesActive =
    pathname === '/shop/favorites' || pathname.startsWith('/shop/favorites/');
  const historyActive =
    pathname === '/shop/history' || pathname.startsWith('/shop/history/');
  const shopSettingsActive =
    pathname === '/shop/settings' ||
    pathname.startsWith('/shop/settings/');

  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]',
        'transition-transform duration-200 ease-out will-change-transform',
        hideBar && 'translate-y-[110%]',
      )}
      aria-hidden={hideBar}
    >
      <nav
        aria-label="商城選單"
        className="pointer-events-auto grid grid-cols-5 rounded-2xl border border-white/15 bg-primary px-1 py-1.5"
      >
        <Link
          href="/dashboard"
          aria-label="前往儀表板"
          className={navItemClass(false)}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
            <Home className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          首頁
        </Link>

        <button
          type="button"
          aria-label="商品分類"
          aria-expanded={isCatalogHome ? categoryPanelOpen : false}
          className={navItemClass(categoryActive)}
          onClick={() => {
            openCategoryPanel();
          }}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
            <LayoutGrid
              className="h-[18px] w-[18px]"
              strokeWidth={categoryActive ? 2.25 : 2}
            />
          </span>
          分類
        </button>

        <Link
          href="/shop/favorites"
          aria-current={favoritesActive ? 'page' : undefined}
          className={navItemClass(favoritesActive)}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
            <Heart
              className="h-[18px] w-[18px]"
              strokeWidth={favoritesActive ? 2.25 : 2}
            />
          </span>
          收藏
        </Link>

        <Link
          href="/shop/history"
          aria-current={historyActive ? 'page' : undefined}
          className={navItemClass(historyActive)}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
            <History
              className="h-[18px] w-[18px]"
              strokeWidth={historyActive ? 2.25 : 2}
            />
          </span>
          <span className="max-w-[3.5rem] text-center text-[10px] leading-tight sm:text-[11px]">
            瀏覽歷史
          </span>
        </Link>

        <Link
          href="/shop/settings"
          aria-current={shopSettingsActive ? 'page' : undefined}
          className={navItemClass(shopSettingsActive)}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
            <Settings
              className="h-[18px] w-[18px]"
              strokeWidth={shopSettingsActive ? 2.25 : 2}
            />
          </span>
          設定
        </Link>
      </nav>
    </div>
  );
}
