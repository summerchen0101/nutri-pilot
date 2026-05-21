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
  const checkoutVendorId = useCartStore((s) => s.checkoutVendorId);
  const {
    selectedItemsSubtotal,
    selectedShippingTotal,
    selectedPayableTotal,
    selectedNetOrderTotal,
    pointsDiscount,
    validLines,
    hasLegacyLines,
  } = useCartDerived();

  function goCheckout() {
    if (!checkoutVendorId) return;
    closeCartPanel();
    openCheckoutPanel();
  }

  return (
    <>
      <div className="w-full shrink-0 border-t-hairline border-border/60 bg-[var(--color-background-primary)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-caption font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => setDetailOpen(true)}
            >
              <span>結帳明細</span>
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0">
              <span className="shrink-0 text-caption text-muted-foreground">
                總計
              </span>
              <span className="min-w-0 text-heading-page tabular-nums text-foreground">
                NT$ {formatShopGroupedInteger(selectedPayableTotal)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="default"
            size="default"
            className="min-w-[140px] shrink-0 px-5"
            disabled={
              !validLines.length || hasLegacyLines || !checkoutVendorId
            }
            onClick={goCheckout}
          >
            繼續結帳
          </Button>
        </div>
      </div>

      <CartTotalsDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        itemsSubtotal={selectedItemsSubtotal}
        shippingTotal={selectedShippingTotal}
        pointsDiscount={pointsDiscount}
        grandTotal={selectedNetOrderTotal}
      />
    </>
  );
}
