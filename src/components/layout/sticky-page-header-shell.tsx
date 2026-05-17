'use client';

import type { ReactNode, RefObject } from 'react';
import { useEffect, useState } from 'react';

import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { cn } from '@/lib/utils/cn';

const SCROLL_SCOPED_BG_PX = 8;

/** 與殼層升起判定一致，側欄等複製同款門檻 */
export const STICKY_PAGE_HEADER_SCROLL_THRESHOLD = SCROLL_SCOPED_BG_PX;

/** 與殼層 `isScrolled` 時一致，供側欄等同款升起態複用 */
export const STICKY_HEADER_ELEVATED_CLASS =
  'border-b-hairline border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75';

export const STICKY_HEADER_REST_CLASS =
  'border-b border-transparent bg-transparent';

export { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from './sticky-page-header-top-safe-class';

interface StickyPageHeaderShellProps {
  children: ReactNode;
  /** 供 IntersectionObserver 等使用（例如商城浮動購物車） */
  anchorId?: string;
  className?: string;
  /**
   * 指定時依該元素 `scrollTop` 判定是否升起（例：全頁購物車內層捲動）。
   * 未指定時維持 `window.scrollY`（商城列表／結帳等）。
   */
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

export function StickyPageHeaderShell({
  children,
  anchorId,
  className,
  scrollContainerRef,
}: StickyPageHeaderShellProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;

    const attachWindow = () => {
      const sync = () => {
        setIsScrolled(window.scrollY > SCROLL_SCOPED_BG_PX);
      };
      sync();
      window.addEventListener('scroll', sync, { passive: true });
      removeListener = () => window.removeEventListener('scroll', sync);
    };

    const attachElement = (el: HTMLElement) => {
      const sync = () => {
        setIsScrolled(el.scrollTop > SCROLL_SCOPED_BG_PX);
      };
      sync();
      el.addEventListener('scroll', sync, { passive: true });
      removeListener = () => el.removeEventListener('scroll', sync);
    };

    if (scrollContainerRef === undefined) {
      attachWindow();
      return () => {
        cancelled = true;
        removeListener?.();
      };
    }

    let attempts = 0;
    const tryAttach = () => {
      if (cancelled) return;
      const el = scrollContainerRef.current;
      if (el) {
        attachElement(el);
        return;
      }
      if (++attempts > 60) {
        attachWindow();
        return;
      }
      requestAnimationFrame(tryAttach);
    };

    tryAttach();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [scrollContainerRef]);

  return (
    <div
      id={anchorId}
      className={cn(
        'sticky top-0 z-[45] -mx-4 mb-1 px-4',
        STICKY_PAGE_HEADER_TOP_SAFE_CLASS,
        'transition-[background-color,border-color,backdrop-filter] duration-200 ease-out',
        isScrolled ? STICKY_HEADER_ELEVATED_CLASS : STICKY_HEADER_REST_CLASS,
        className,
      )}
    >
      {children}
    </div>
  );
}
