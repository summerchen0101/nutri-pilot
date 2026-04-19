'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CheckoutMode = 'payment' | 'subscription';

export interface CartLine {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  qty: number;
  /** 單次售價（元） */
  unitPrice: number;
  /** 訂閱單價（元），無則不可訂閱 */
  subPrice: number | null;
  stripePriceId: string | null;
  stripeSubPriceId: string | null;
}

interface CartState {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, 'qty'> & { qty?: number }) => void;
  setQty: (variantId: string, qty: number) => void;
  removeLine: (variantId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      addLine: (line) => {
        const qty = line.qty ?? 1;
        const existing = get().lines.find((l) => l.variantId === line.variantId);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.variantId === line.variantId ?
                { ...l, qty: l.qty + qty }
              : l,
            ),
          });
          return;
        }
        set({
          lines: [
            ...get().lines,
            {
              variantId: line.variantId,
              productId: line.productId,
              productName: line.productName,
              variantLabel: line.variantLabel,
              qty,
              unitPrice: line.unitPrice,
              subPrice: line.subPrice,
              stripePriceId: line.stripePriceId,
              stripeSubPriceId: line.stripeSubPriceId,
            },
          ],
        });
      },
      setQty: (variantId, qty) => {
        if (qty < 1) {
          set({ lines: get().lines.filter((l) => l.variantId !== variantId) });
          return;
        }
        set({
          lines: get().lines.map((l) =>
            l.variantId === variantId ? { ...l, qty } : l,
          ),
        });
      },
      removeLine: (variantId) =>
        set({ lines: get().lines.filter((l) => l.variantId !== variantId) }),
      clear: () => set({ lines: [] }),
    }),
    { name: 'nutri-guard-shop-cart' },
  ),
);

export function cartTotalPayment(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
}

export function cartTotalSubscription(lines: CartLine[]): number {
  return lines.reduce((s, l) => {
    const p = l.subPrice ?? l.unitPrice;
    return s + p * l.qty;
  }, 0);
}
