'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/layout/bottom-nav';

const SHOW_BOTTOM_NAV = ['/dashboard', '/log', '/shop', '/analytics', '/settings'] as const;
const COMPACT_BOTTOM_PADDING = ['/dashboard', '/analytics'] as const;

function shouldShowBottomNav(pathname: string): boolean {
  return SHOW_BOTTOM_NAV.some((basePath) => pathname === basePath);
}

function shouldUseCompactBottomPadding(pathname: string): boolean {
  return COMPACT_BOTTOM_PADDING.some((basePath) => pathname === basePath);
}

export function MainAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showBottomNav = shouldShowBottomNav(pathname);
  const compactBottomPadding = shouldUseCompactBottomPadding(pathname);
  const contentPaddingClass = showBottomNav
    ? compactBottomPadding
      ? 'mx-auto max-w-sm px-4 pb-20 pt-6'
      : 'mx-auto max-w-sm px-4 pb-24 pt-6'
    : 'mx-auto max-w-sm px-4 pb-6 pt-6';

  return (
    <div className="relative min-h-screen bg-background">
      <div className={contentPaddingClass}>
        {children}
      </div>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
