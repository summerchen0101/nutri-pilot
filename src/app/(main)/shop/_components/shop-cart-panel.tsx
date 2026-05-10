'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { CartView } from '@/app/(main)/shop/cart/cart-view';
import { useCartStore } from '@/lib/shop/cart-store';
import { cn } from '@/lib/utils/cn';

export function ShopCartPanel(): ReactNode {
  const open = useCartStore((s) => s.isCartPanelOpen);
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);

  const node = (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-end',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/35 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        aria-label="關閉"
        onClick={closeCartPanel}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          'relative flex h-full min-h-0 w-full max-w-md flex-col bg-[var(--color-background-primary)] transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b-hairline border-border px-4 py-3 pr-3">
          <h2 className="text-heading-page text-foreground">購物車</h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-primary transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            aria-label="關閉購物車"
            onClick={closeCartPanel}
          >
            <X className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <CartView />
        </div>
      </aside>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
