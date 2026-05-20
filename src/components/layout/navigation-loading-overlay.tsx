'use client';

import { cn } from '@/lib/utils/cn';

/** 與 BottomNav / ShopBottomNav 高度對齊：pt-2 + nav + pb safe-area */
const BOTTOM_NAV_RESERVE_CLASS =
  'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]';

const DOT_DELAYS_MS = [0, 150, 300] as const;

function NavigationLoadingDots() {
  return (
    <div
      className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light"
      aria-hidden
    >
      <div className="flex items-center gap-1.5">
        {DOT_DELAYS_MS.map((delayMs) => (
          <span
            key={delayMs}
            className="inline-block h-2 w-2 animate-loading-dot rounded-full bg-primary"
            style={{ animationDelay: `${delayMs}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

interface NavigationLoadingOverlayProps {
  isVisible: boolean;
  hasBottomNav: boolean;
}

export function NavigationLoadingOverlay({
  isVisible,
  hasBottomNav,
}: NavigationLoadingOverlayProps) {
  return (
    <div
      aria-busy={isVisible}
      aria-hidden={!isVisible}
      className={cn(
        'fixed inset-x-0 top-0 z-30 flex items-center justify-center bg-background/80 transition-opacity duration-150 ease-out',
        hasBottomNav ? BOTTOM_NAV_RESERVE_CLASS : 'bottom-0',
        isVisible ?
          'pointer-events-auto opacity-100'
        : 'pointer-events-none opacity-0',
      )}
    >
      <div
        role="status"
        className={cn(
          'transition-opacity duration-150 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <NavigationLoadingDots />
        <span className="sr-only">載入中</span>
      </div>
    </div>
  );
}
