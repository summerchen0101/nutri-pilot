'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function pruneVendorShippingSelections(
  selections: Record<string, string>,
  lines: CartLine[],
): Record<string, string> {
  const ids = new Set(
    lines.map((l) => l.vendorId).filter((id) => typeof id === 'string' && id.length > 0),
  );
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(selections)) {
    if (ids.has(k)) next[k] = v;
  }
  return next;
}

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
  /** 廠商基本運費（元），加入購物車時快照；無 shipping_methods 時作 fallback */
  shippingFee: number;
  /** 免運門檻（元），null = 無免運；無 shipping_methods 時作 fallback */
  freeShippingThreshold: number | null;
  leadTimeDays: number;
  /** 對應 `products.image_url`；舊版 localStorage 資料可能無此欄 */
  imageUrl?: string | null;
}

interface CartState {
  lines: CartLine[];
  /** 每廠商目前選擇的 `vendor_shipping_methods.id` */
  vendorShippingSelections: Record<string, string>;
  isCartPanelOpen: boolean;
  openCartPanel: () => void;
  closeCartPanel: () => void;
  addLine: (line: Omit<CartLine, 'qty'> & { qty?: number }) => void;
  setQty: (variantId: string, qty: number) => void;
  removeLine: (variantId: string) => void;
  setVendorShippingSelection: (vendorId: string, methodId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      vendorShippingSelections: {},
      isCartPanelOpen: false,
      openCartPanel: () => set({ isCartPanelOpen: true }),
      closeCartPanel: () => set({ isCartPanelOpen: false }),
      addLine: (line) => {
        const qty = line.qty ?? 1;
        const existing = get().lines.find((l) => l.variantId === line.variantId);
        if (existing) {
          const nextLines = get().lines.map((l) =>
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
          );
          set({
            lines: nextLines,
            vendorShippingSelections: pruneVendorShippingSelections(
              get().vendorShippingSelections,
              nextLines,
            ),
          });
          return;
        }
        const nextLines = [
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
        ];
        set({
          lines: nextLines,
          vendorShippingSelections: pruneVendorShippingSelections(
            get().vendorShippingSelections,
            nextLines,
          ),
        });
      },
      setQty: (variantId, qty) => {
        if (qty < 1) {
          const nextLines = get().lines.filter((l) => l.variantId !== variantId);
          set({
            lines: nextLines,
            vendorShippingSelections: pruneVendorShippingSelections(
              get().vendorShippingSelections,
              nextLines,
            ),
          });
          return;
        }
        const nextLines = get().lines.map((l) =>
          l.variantId === variantId ? { ...l, qty } : l,
        );
        set({
          lines: nextLines,
          vendorShippingSelections: pruneVendorShippingSelections(
            get().vendorShippingSelections,
            nextLines,
          ),
        });
      },
      removeLine: (variantId) => {
        const nextLines = get().lines.filter((l) => l.variantId !== variantId);
        set({
          lines: nextLines,
          vendorShippingSelections: pruneVendorShippingSelections(
            get().vendorShippingSelections,
            nextLines,
          ),
        });
      },
      setVendorShippingSelection: (vendorId, methodId) =>
        set({
          vendorShippingSelections: {
            ...get().vendorShippingSelections,
            [vendorId]: methodId,
          },
        }),
      clear: () => set({ lines: [], vendorShippingSelections: {} }),
    }),
    {
      name: 'nutri-guard-shop-cart-v3',
      version: 1,
      migrate: async (persistedState) => {
        const raw = persistedState as Record<string, unknown> | undefined;
        if (
          raw &&
          typeof raw === 'object' &&
          typeof raw.vendorShippingSelections !== 'object'
        ) {
          return {
            ...raw,
            vendorShippingSelections: {},
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        lines: state.lines,
        vendorShippingSelections: state.vendorShippingSelections,
      }),
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
