'use client';

import Link from 'next/link';

import { CheckoutProgressSteps } from '@/app/(main)/shop/cart/checkout-progress-steps';
import { CartFixedSummaryBar } from '@/app/(main)/shop/cart/cart-fixed-summary-bar';
import { CartView } from '@/app/(main)/shop/cart/cart-view';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useCartDerived } from '@/lib/shop/use-cart-derived';
import { useCartStore } from '@/lib/shop/cart-store';

const SCROLL_PADDING_BOTTOM =
  'pb-[calc(14rem+env(safe-area-inset-bottom))]';

export function ShopCartPageClient() {
  const lines = useCartStore((s) => s.lines);
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);
  const { maxLeadTimeDays } = useCartDerived();

  const headerBlock = (
    <>
      <PageHeader
        leading={<HeaderBackButton />}
        title="購物車"
        action={
          <Link href="/shop" className="text-body font-medium text-primary">
            繼續逛
          </Link>
        }
      />
      <CheckoutProgressSteps />
    </>
  );

  if (lines.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
        <div className="shrink-0 border-b-hairline border-border bg-[var(--color-background-primary)]">
          {headerBlock}
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <EmptyState
            message="購物車是空的"
            actionHref="/shop"
            actionLabel="前往商城"
            onActionNavigate={closeCartPanel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-9rem)] flex-col">
      <div className="sticky top-0 z-20 shrink-0 border-b-hairline border-border bg-[var(--color-background-primary)]">
        {headerBlock}
      </div>
      <div
        className={`min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] ${SCROLL_PADDING_BOTTOM}`}>
        <CartView layout="page" embedded />
      </div>
      <CartFixedSummaryBar maxLeadTimeDays={maxLeadTimeDays} />
    </div>
  );
}
