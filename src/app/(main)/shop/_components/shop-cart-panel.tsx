'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ShopRightSheet } from '@/app/(main)/shop/_components/shop-right-sheet';
import { CartView } from '@/app/(main)/shop/cart/cart-view';
import { useCartStore } from '@/lib/shop/cart-store';

export function ShopCartPanel(): ReactNode {
  const open = useCartStore((s) => s.isCartPanelOpen);
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);

  const node = (
    <ShopRightSheet
      open={open}
      onClose={closeCartPanel}
      title="購物車"
      titleClassName="text-primary"
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <CartView layout="panel" />
      </div>
    </ShopRightSheet>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
