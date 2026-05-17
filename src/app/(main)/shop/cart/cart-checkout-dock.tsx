'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { CartTotalsDetailSheet } from '@/app/(main)/shop/cart/cart-totals-detail-sheet';
import { Button } from '@/components/ui/button';
import { useCartDerived } from '@/lib/shop/use-cart-derived';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export function CartCheckoutDock() {
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);
  const openCheckoutPanel = useCartStore((s) => s.openCheckoutPanel);
  const [detailOpen, setDetailOpen] = useState(false);
  const {
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    validLines,
    hasLegacyLines,
  } = useCartDerived();

  /** 與 `grandTotal` 同值（商品小計 + 運費合計），寫成相加以利閱讀 */
  const checkoutTotalIncludingShipping = itemsSubtotal + shippingTotal;

  function goCheckout() {
    closeCartPanel();
    openCheckoutPanel();
  }

  const outerClass = "overflow-hidden bg-[var(--color-background-primary)]";

  const pbSafe = "pb-[max(0.75rem,env(safe-area-inset-bottom))]";

  return (
    <>
      <div className={outerClass}>
        <div className={`px-3 pt-3 ${pbSafe}`}>
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-caption font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setDetailOpen(true)}>
                <span>結帳明細</span>
                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </button>
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-caption text-foreground">金額總計</span>
                <span className="text-heading-screen font-semibold tabular-nums text-primary tracking-tight">
                  NT$ {formatShopGroupedInteger(checkoutTotalIncludingShipping)}
                </span>
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
