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

function pruneCheckoutVendorId(
  checkoutVendorId: string | null,
  lines: CartLine[],
): string | null {
  if (!checkoutVendorId) return null;
  const has = lines.some((l) => l.vendorId === checkoutVendorId);
  return has ? checkoutVendorId : null;
}

function applyLinesUpdate(
  lines: CartLine[],
  vendorShippingSelections: Record<string, string>,
  checkoutVendorId: string | null,
): Pick<CartState, 'lines' | 'vendorShippingSelections' | 'checkoutVendorId'> {
  return {
    lines,
    vendorShippingSelections: pruneVendorShippingSelections(
      vendorShippingSelections,
      lines,
    ),
    checkoutVendorId: pruneCheckoutVendorId(checkoutVendorId, lines),
  };
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
  /** 本次要結帳的廠商（單選） */
  checkoutVendorId: string | null;
  /** 最近完成結帳的廠商，供 success 頁局部清空購物車 */
  lastCheckedOutVendorId: string | null;
  isCartPanelOpen: boolean;
  isCheckoutPanelOpen: boolean;
  openCartPanel: () => void;
  closeCartPanel: () => void;
  openCheckoutPanel: () => void;
  closeCheckoutPanel: () => void;
  addLine: (line: Omit<CartLine, 'qty'> & { qty?: number }) => void;
  setQty: (variantId: string, qty: number) => void;
  removeLine: (variantId: string) => void;
  setVendorShippingSelection: (vendorId: string, methodId: string) => void;
  setCheckoutVendorId: (vendorId: string | null) => void;
  removeLinesByVendor: (vendorId: string) => void;
  setLastCheckedOutVendorId: (vendorId: string | null) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      vendorShippingSelections: {},
      checkoutVendorId: null,
      lastCheckedOutVendorId: null,
      isCartPanelOpen: false,
      isCheckoutPanelOpen: false,
      openCartPanel: () => set({ isCartPanelOpen: true }),
      closeCartPanel: () => set({ isCartPanelOpen: false }),
      openCheckoutPanel: () => set({ isCheckoutPanelOpen: true }),
      closeCheckoutPanel: () => set({ isCheckoutPanelOpen: false }),
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
          set(
            applyLinesUpdate(
              nextLines,
              get().vendorShippingSelections,
              get().checkoutVendorId,
            ),
          );
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
        set(
          applyLinesUpdate(
            nextLines,
            get().vendorShippingSelections,
            get().checkoutVendorId,
          ),
        );
      },
      setQty: (variantId, qty) => {
        if (qty < 1) {
          const nextLines = get().lines.filter((l) => l.variantId !== variantId);
          set(
            applyLinesUpdate(
              nextLines,
              get().vendorShippingSelections,
              get().checkoutVendorId,
            ),
          );
          return;
        }
        const nextLines = get().lines.map((l) =>
          l.variantId === variantId ? { ...l, qty } : l,
        );
        set(
          applyLinesUpdate(
            nextLines,
            get().vendorShippingSelections,
            get().checkoutVendorId,
          ),
        );
      },
      removeLine: (variantId) => {
        const nextLines = get().lines.filter((l) => l.variantId !== variantId);
        set(
          applyLinesUpdate(
            nextLines,
            get().vendorShippingSelections,
            get().checkoutVendorId,
          ),
        );
      },
      setVendorShippingSelection: (vendorId, methodId) =>
        set({
          vendorShippingSelections: {
            ...get().vendorShippingSelections,
            [vendorId]: methodId,
          },
        }),
      setCheckoutVendorId: (vendorId) => set({ checkoutVendorId: vendorId }),
      removeLinesByVendor: (vendorId) => {
        const nextLines = get().lines.filter((l) => l.vendorId !== vendorId);
        const nextSelections = { ...get().vendorShippingSelections };
        delete nextSelections[vendorId];
        set({
          ...applyLinesUpdate(nextLines, nextSelections, get().checkoutVendorId),
          checkoutVendorId:
            get().checkoutVendorId === vendorId ? null : get().checkoutVendorId,
        });
      },
      setLastCheckedOutVendorId: (vendorId) =>
        set({ lastCheckedOutVendorId: vendorId }),
      clear: () =>
        set({
          lines: [],
          vendorShippingSelections: {},
          checkoutVendorId: null,
        }),
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
        checkoutVendorId: state.checkoutVendorId,
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
