import type { CartLine } from '@/lib/shop/cart-store';
import type { VendorShippingMethodLite } from '@/lib/shop/vendor-shipping-method-types';
import {
  cartTotalItemsSubtotal,
  effectiveShippingForVendor,
} from '@/lib/shop/cart-store';

/** 已下架之門市自取內碼；仍過濾以防快取或異常資料 */
export const STORE_PICKUP_SHIPPING_CODE = 'store_pickup';

export interface VendorShippingSummary {
  vendorId: string;
  vendorName: string;
  lines: CartLine[];
  itemsSubtotal: number;
  shippingFee: number;
  freeShippingThreshold: number | null;
  effectiveShipping: number;
  /** 距離免運尚差金額；已免運或無門檻為 null */
  gapToFreeShipping: number | null;
  selectedShippingMethodId: string | null;
  selectedShippingMethodLabel: string | null;
  availableShippingMethods: VendorShippingMethodLite[];
}

export function filterCheckoutShippingMethods(
  methods: VendorShippingMethodLite[],
): VendorShippingMethodLite[] {
  return methods.filter((m) => m.code !== STORE_PICKUP_SHIPPING_CODE);
}

export function sortShippingMethods(
  methods: VendorShippingMethodLite[],
): VendorShippingMethodLite[] {
  return [...methods].sort(
    (a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code),
  );
}

/**
 * 自動選運送方式：effective 運費低者優先（0＝免運最優），
 * 平手再依標示運費 `shipping_fee` 由低到高，最後 `sort_order`、`code`。
 */
function compareShippingMethodsForAutoPick(
  a: VendorShippingMethodLite,
  b: VendorShippingMethodLite,
  itemsSubtotalRounded: number,
): number {
  const effA = effectiveShippingForVendor(
    itemsSubtotalRounded,
    a.shipping_fee,
    a.free_shipping_threshold,
  );
  const effB = effectiveShippingForVendor(
    itemsSubtotalRounded,
    b.shipping_fee,
    b.free_shipping_threshold,
  );
  if (effA !== effB) return effA - effB;
  if (a.shipping_fee !== b.shipping_fee) return a.shipping_fee - b.shipping_fee;
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.code.localeCompare(b.code);
}

export function pickCheapestShippingMethod(
  methods: VendorShippingMethodLite[],
  itemsSubtotalRounded: number,
): VendorShippingMethodLite | null {
  const rows = sortShippingMethods(filterCheckoutShippingMethods(methods));
  if (rows.length === 0) return null;

  let best = rows[0]!;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    if (compareShippingMethodsForAutoPick(row, best, itemsSubtotalRounded) < 0) {
      best = row;
    }
  }
  return best;
}

/** 為單廠選定可用列／fallback CartLine */
function resolveMethodRow(
  vendorId: string,
  selections: Record<string, string>,
  methodsByVendor: Map<string, VendorShippingMethodLite[]>,
  fallbackLine: CartLine,
  itemsSubtotalRounded: number,
): {
  shippingFee: number;
  freeShippingThreshold: number | null;
  methodId: string | null;
  methodLabel: string | null;
} {
  const rawRows = methodsByVendor.get(vendorId) ?? [];
  const sorted = sortShippingMethods(filterCheckoutShippingMethods(rawRows));
  if (sorted.length === 0) {
    return {
      shippingFee: fallbackLine.shippingFee,
      freeShippingThreshold: fallbackLine.freeShippingThreshold,
      methodId: null,
      methodLabel: null,
    };
  }
  const sel = selections[vendorId];
  const fromSel = sel ? sorted.find((r) => r.id === sel) : undefined;
  const cheapest = pickCheapestShippingMethod(rawRows, itemsSubtotalRounded);
  const picked = fromSel ?? cheapest ?? sorted[0]!;
  return {
    shippingFee: picked.shipping_fee,
    freeShippingThreshold: picked.free_shipping_threshold,
    methodId: picked.id,
    methodLabel: picked.label,
  };
}

/**
 * 依廠商分組並計算運費。若無任何 method 資料，退回 CartLine 上快照運費（舊版）。
 */
export function calcVendorShippingSummaries(
  lines: CartLine[],
  selections: Record<string, string>,
  methodsByVendor: Map<string, VendorShippingMethodLite[]>,
): VendorShippingSummary[] {
  const valid = lines.filter(
    (l) =>
      typeof l.vendorId === 'string' &&
      l.vendorId.length > 0 &&
      typeof l.vendorName === 'string' &&
      l.vendorName.length > 0,
  );
  const byVendor = new Map<string, CartLine[]>();
  for (const line of valid) {
    const arr = byVendor.get(line.vendorId) ?? [];
    arr.push(line);
    byVendor.set(line.vendorId, arr);
  }

  const out: VendorShippingSummary[] = [];
  for (const group of Array.from(byVendor.values())) {
    const first = group[0]!;
    const itemsSubtotal = group.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const roundedSub = Math.round(itemsSubtotal);
    const resolved = resolveMethodRow(
      first.vendorId,
      selections,
      methodsByVendor,
      first,
      roundedSub,
    );
    const eff = effectiveShippingForVendor(
      roundedSub,
      resolved.shippingFee,
      resolved.freeShippingThreshold,
    );
    const gapToFree =
      resolved.freeShippingThreshold == null ? null
      : eff === 0 ? null
      : Math.max(0, resolved.freeShippingThreshold - roundedSub);
    const rawAvailable = methodsByVendor.get(first.vendorId) ?? [];
    const available = sortShippingMethods(
      filterCheckoutShippingMethods(rawAvailable),
    );

    out.push({
      vendorId: first.vendorId,
      vendorName: first.vendorName,
      lines: group,
      itemsSubtotal: roundedSub,
      shippingFee: resolved.shippingFee,
      freeShippingThreshold: resolved.freeShippingThreshold,
      effectiveShipping: eff,
      gapToFreeShipping: gapToFree,
      selectedShippingMethodId: resolved.methodId,
      selectedShippingMethodLabel: resolved.methodLabel,
      availableShippingMethods: available,
    });
  }

  return out.sort((a, b) => a.vendorName.localeCompare(b.vendorName, 'zh-Hant'));
}

export function cartTotalShipping(summaries: VendorShippingSummary[]): number {
  return summaries.reduce((s, v) => s + v.effectiveShipping, 0);
}

export function cartGrandTotalFromSummaries(
  lines: CartLine[],
  summaries: VendorShippingSummary[],
): number {
  return cartTotalItemsSubtotal(lines) + cartTotalShipping(summaries);
}

/** @deprecated Prefer cartGrandTotalFromSummaries with explicit summaries */
export function cartGrandTotal(lines: CartLine[]): number {
  return cartTotalItemsSubtotal(lines) + cartTotalShipping(
    calcVendorShippingSummaries(lines, {}, new Map()),
  );
}
