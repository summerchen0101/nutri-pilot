'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/layout/bottom-nav';

const SHOW_BOTTOM_NAV = ['/dashboard', '/log', '/shop', '/analytics', '/settings'] as const;

function shouldShowBottomNav(pathname: string): boolean {
  return SHOW_BOTTOM_NAV.some((basePath) => pathname === basePath);
}

export function MainAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showBottomNav = shouldShowBottomNav(pathname);

  return (
    <div className="relative min-h-screen bg-background">
      <div className={showBottomNav ? 'mx-auto max-w-sm px-4 pb-28 pt-6' : 'mx-auto max-w-sm px-4 pb-6 pt-6'}>
        {children}
      </div>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
