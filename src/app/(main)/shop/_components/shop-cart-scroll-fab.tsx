'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiShoppingCart } from 'react-icons/fi';

import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';
import { useCartStore } from '@/lib/shop/cart-store';
import { cn } from '@/lib/utils/cn';

/** 載入過渡或短暫缺 DOM 時，避免 rAF 無限輪詢 */
const ATTACH_RETRY_MAX_FRAMES = 90;

export function ShopCartScrollFab() {
  const pathname = usePathname();
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    if (pathname === '/shop/cart') return;

    setIsHeaderVisible(true);

    let observer: IntersectionObserver | undefined;
    let cancelled = false;
    let retryFrames = 0;
    let rafId = 0;

    const cleanupObserver = () => {
      observer?.disconnect();
      observer = undefined;
    };

    const tryAttach = () => {
      if (cancelled) return;

      const node = document.getElementById(SHOP_HEADER_SCROLL_ANCHOR_ID);
      if (!node) {
        if (retryFrames < ATTACH_RETRY_MAX_FRAMES) {
          retryFrames += 1;
          rafId = requestAnimationFrame(tryAttach);
        }
        return;
      }

      cleanupObserver();
      observer = new IntersectionObserver(
        ([entry]) => {
          setIsHeaderVisible(entry?.isIntersecting ?? true);
        },
        { threshold: 0, rootMargin: '0px' },
      );
      observer.observe(node);
    };

    tryAttach();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      cleanupObserver();
    };
  }, [pathname]);

  if (pathname === '/shop/cart') return null;

  if (isHeaderVisible) return null;

  return (
    <button
      type="button"
      aria-label="購物車"
      className={cn(
        'fixed right-4 z-[44] flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary',
        'text-[var(--color-background-primary)] transition-opacity duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C]',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background-primary)]',
        'active:opacity-95',
        /** 留出 bottom nav（z-40）與 safe area */
        'bottom-[max(6rem,calc(env(safe-area-inset-bottom)+5.75rem))]',
      )}
      onClick={() => openCartPanel()}
    >
      <FiShoppingCart className="h-[22px] w-[22px]" aria-hidden />
    </button>
  );
}
