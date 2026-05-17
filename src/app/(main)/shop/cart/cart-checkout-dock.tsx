'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CartTotalsDetailSheet } from '@/app/(main)/shop/cart/cart-totals-detail-sheet';
import { Button } from '@/components/ui/button';
import { useCartDerived } from '@/lib/shop/use-cart-derived';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface CartCheckoutDockProps {
  /** `page`：全頁底部圓角＋細框；`panel`：側欄無外框 */
  variant?: 'page' | 'panel';
}

export function CartCheckoutDock({ variant = 'page' }: CartCheckoutDockProps) {
  const router = useRouter();
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);
  const [detailOpen, setDetailOpen] = useState(false);
  const {
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    validLines,
    hasLegacyLines,
  } = useCartDerived();

  function goCheckout() {
    closeCartPanel();
    router.push('/shop/checkout');
  }

  const outerClass = 'overflow-hidden bg-[var(--color-background-primary)]';

  const pbSafe = 'pb-[max(0.75rem,env(safe-area-inset-bottom))]';

  return (
    <>
      <div className={outerClass}>
        <div className={`px-3 pt-3 ${pbSafe}`}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className="block text-caption font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setDetailOpen(true)}>
                明細
              </button>
              <p className="mt-0.5 text-heading-section tabular-nums text-primary">
                訂單總計 NT$ {formatShopGroupedInteger(grandTotal)}
              </p>
            </div>
            <Button
              type="button"
              className="min-h-11 min-w-[9rem] shrink-0"
              disabled={!validLines.length || hasLegacyLines}
              onClick={goCheckout}>
              繼續結帳
            </Button>
          </div>
        </div>
      </div>

      <CartTotalsDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        itemsSubtotal={itemsSubtotal}
        shippingTotal={shippingTotal}
        grandTotal={grandTotal}
      />
    </>
  );
}
