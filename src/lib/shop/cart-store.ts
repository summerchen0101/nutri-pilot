'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartLine {
  variantId: string;
  productId: string;
  vendorId: string;
  vendorName: string;
  productName: string;
  variantLabel: string;
  qty: number;
  /** 單次售價（元） */
  unitPrice: number;
  /** 廠商基本運費（元），加入購物車時快照 */
  shippingFee: number;
  /** 免運門檻（元），null = 無免運 */
  freeShippingThreshold: number | null;
  leadTimeDays: number;
  /** 對應 `products.image_url`；舊版 localStorage 資料可能無此欄 */
  imageUrl?: string | null;
}

interface CartState {
  lines: CartLine[];
  isCartPanelOpen: boolean;
  openCartPanel: () => void;
  closeCartPanel: () => void;
  addLine: (line: Omit<CartLine, 'qty'> & { qty?: number }) => void;
  setQty: (variantId: string, qty: number) => void;
  removeLine: (variantId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isCartPanelOpen: false,
      openCartPanel: () => set({ isCartPanelOpen: true }),
      closeCartPanel: () => set({ isCartPanelOpen: false }),
      addLine: (line) => {
        const qty = line.qty ?? 1;
        const existing = get().lines.find((l) => l.variantId === line.variantId);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.variantId === line.variantId ?
                {
                  ...l,
                  qty: l.qty + qty,
                  imageUrl: line.imageUrl ?? l.imageUrl,
                  vendorId: line.vendorId,
                  vendorName: line.vendorName,
                  shippingFee: line.shippingFee,
                  freeShippingThreshold: line.freeShippingThreshold,
                  leadTimeDays: line.leadTimeDays,
                }
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
              vendorId: line.vendorId,
              vendorName: line.vendorName,
              productName: line.productName,
              variantLabel: line.variantLabel,
              qty,
              unitPrice: line.unitPrice,
              shippingFee: line.shippingFee,
              freeShippingThreshold: line.freeShippingThreshold,
              leadTimeDays: line.leadTimeDays,
              imageUrl: line.imageUrl ?? null,
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
    {
      name: 'nutri-guard-shop-cart-v3',
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

export function cartTotalItemsSubtotal(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
}

/** 與 Edge `effectiveShippingFee` 相同邏輯 */
export function effectiveShippingForVendor(
  itemsSubtotal: number,
  shippingFee: number,
  freeShippingThreshold: number | null,
): number {
  if (freeShippingThreshold == null) {
    return shippingFee;
  }
  if (itemsSubtotal >= freeShippingThreshold) {
    return 0;
  }
  return shippingFee;
}
