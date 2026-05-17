'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState } from 'react';

import { ShopRightSheet } from '@/app/(main)/shop/_components/shop-right-sheet';
import { CartView } from '@/app/(main)/shop/cart/cart-view';
import { STICKY_PAGE_HEADER_SCROLL_THRESHOLD } from '@/components/layout/sticky-page-header-shell';
import { useCartStore } from '@/lib/shop/cart-store';

export function ShopCartPanel(): ReactNode {
  const open = useCartStore((s) => s.isCartPanelOpen);
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);

  const [elevatedHeader, setElevatedHeader] = useState(false);

  useEffect(() => {
    if (!open) setElevatedHeader(false);
  }, [open]);

  const onPanelScrollTopChange = useCallback((scrollTop: number) => {
    setElevatedHeader(scrollTop > STICKY_PAGE_HEADER_SCROLL_THRESHOLD);
  }, []);

  const node = (
    <ShopRightSheet
      open={open}
      onClose={closeCartPanel}
      title="購物車"
      asideVariant="mutedBody"
      elevatedHeader={elevatedHeader}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <CartView layout="panel" onPanelScrollTopChange={onPanelScrollTopChange} />
      </div>
    </ShopRightSheet>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
