'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Shield,
  ShoppingCart,
  UserRound,
} from 'lucide-react';

import { isShopCatalogHomePathname } from '@/lib/shop/shop-path';
import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/dashboard', label: '總覽', Icon: LayoutDashboard },
  { href: '/guard', label: '守衛', Icon: Shield },
  { href: '/log', label: '紀錄', Icon: PlusCircle },
  { href: '/shop', label: '商城', Icon: ShoppingCart },
  { href: '/settings', label: '我的', Icon: UserRound },
] as const;

/** 捲動回頂附近時一律顯示主選單 */
const SCROLL_TOP_SHOW_NAV_PX = 40;
/** 判定「向下捲」的最小累積位移（px） */
const SCROLL_DOWN_DELTA_THRESHOLD = 6;

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const isCatalogHome = isShopCatalogHomePathname(pathname);

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
        aria-label="主選單"
        className="pointer-events-auto grid grid-cols-5 rounded-2xl border border-white/15 bg-primary px-1 py-1.5"
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] touch-manipulation cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium transition-colors duration-150 ease-out active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-1 focus-visible:ring-offset-primary',
                active ? 'bg-white/20 text-white' : 'text-white/70',
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                <Icon
                  className="h-[18px] w-[18px]"
                  strokeWidth={active ? 2.25 : 2}
                  aria-hidden
                />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
