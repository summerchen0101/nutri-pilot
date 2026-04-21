'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/layout/bottom-nav';

const SHOW_BOTTOM_NAV = ['/dashboard', '/log', '/shop', '/guard', '/settings'] as const;
const COMPACT_BOTTOM_PADDING = ['/dashboard', '/guard'] as const;

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
      ? 'mx-auto max-w-sm px-4 pb-24 pt-5'
      : 'mx-auto max-w-sm px-4 pb-28 pt-5'
    : 'mx-auto max-w-sm px-4 pb-8 pt-5';

  return (
    <div className="relative min-h-screen bg-surface-secondary">
      <div className={contentPaddingClass}>
        {children}
      </div>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
