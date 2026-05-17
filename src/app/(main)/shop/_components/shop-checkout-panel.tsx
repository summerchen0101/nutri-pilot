'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';

import { ShopRightSheet } from '@/app/(main)/shop/_components/shop-right-sheet';
import {
  CheckoutClient,
  CheckoutPanelBackButton,
} from '@/app/(main)/shop/checkout/checkout-client';
import { STICKY_PAGE_HEADER_SCROLL_THRESHOLD } from '@/components/layout/sticky-page-header-shell';
import { useCartStore } from '@/lib/shop/cart-store';

export function ShopCheckoutPanel(): ReactNode {
  const open = useCartStore((s) => s.isCheckoutPanelOpen);
  const closeCheckoutPanel = useCartStore((s) => s.closeCheckoutPanel);
  const openCartPanel = useCartStore((s) => s.openCartPanel);

  const [elevatedHeader, setElevatedHeader] = useState(false);

  useEffect(() => {
    if (!open) setElevatedHeader(false);
  }, [open]);

  const onBodyScrollTopChange = useCallback((scrollTop: number) => {
    setElevatedHeader(scrollTop > STICKY_PAGE_HEADER_SCROLL_THRESHOLD);
  }, []);

  function goBackToCart() {
    closeCheckoutPanel();
    openCartPanel();
  }

  const node = (
    <ShopRightSheet
      open={open}
      onClose={closeCheckoutPanel}
      title="結帳"
      leading={<CheckoutPanelBackButton onBack={goBackToCart} />}
      asideVariant="mutedBody"
      elevatedHeader={elevatedHeader}
      stackZClassName="z-[56]"
    >
      <CheckoutClient onBodyScrollTopChange={onBodyScrollTopChange} />
    </ShopRightSheet>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
