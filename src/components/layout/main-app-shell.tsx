'use client';

import type { ReactNode } from 'react';

import { BottomNav } from '@/components/layout/bottom-nav';

export function MainAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="mx-auto max-w-sm px-4 pb-28 pt-6">{children}</div>
      <BottomNav />
    </div>
  );
}
