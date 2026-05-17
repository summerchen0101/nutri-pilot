'use client';

import { CartCheckoutDock } from '@/app/(main)/shop/cart/cart-checkout-dock';
import { cn } from '@/lib/utils/cn';

/** BottomNav 主選單高度概估 + safe area，使固定列疊在導航列上方 */
const FIXED_BAR_BOTTOM_CLASS =
  'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]';

export function CartFixedSummaryBar() {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-30',
        FIXED_BAR_BOTTOM_CLASS,
      )}
    >
      <div className="pointer-events-auto w-full border-t-hairline border-border bg-[var(--color-background-primary)]">
        <div className="mx-auto w-full max-w-sm px-4">
          <CartCheckoutDock variant="page" />
        </div>
      </div>
    </div>
  );
}
