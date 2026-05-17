'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { cn } from '@/lib/utils/cn';

const SCROLL_SCOPED_BG_PX = 8;

export { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from './sticky-page-header-top-safe-class';

interface StickyPageHeaderShellProps {
  children: ReactNode;
  /** 供 IntersectionObserver 等使用（例如商城浮動購物車） */
  anchorId?: string;
  className?: string;
}

export function StickyPageHeaderShell({
  children,
  anchorId,
  className,
}: StickyPageHeaderShellProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_SCOPED_BG_PX);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div
      id={anchorId}
      className={cn(
        'sticky top-0 z-[45] -mx-4 mb-1 px-4',
        STICKY_PAGE_HEADER_TOP_SAFE_CLASS,
        'transition-[background-color,border-color,backdrop-filter] duration-200 ease-out',
        isScrolled ?
          'border-b-hairline border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75'
        : 'border-b border-transparent bg-transparent',
        className,
      )}
    >
      {children}
    </div>
  );
}
