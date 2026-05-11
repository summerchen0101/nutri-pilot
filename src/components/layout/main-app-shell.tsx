'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/layout/bottom-nav';

function shouldUseCompactBottomPadding(pathname: string): boolean {
  if (pathname === '/dashboard') return true;
  return pathname === '/guard' || pathname.startsWith('/guard/');
}

export function MainAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const compactBottomPadding = shouldUseCompactBottomPadding(pathname);
  const contentPaddingClass = compactBottomPadding
    ? 'mx-auto max-w-sm px-4 pb-24 pt-5'
    : 'mx-auto max-w-sm px-4 pb-28 pt-5';

  return (
    <div className="relative min-h-screen">
      <div className={contentPaddingClass}>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
