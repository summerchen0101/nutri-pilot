import type { CartLine } from '@/lib/shop/cart-store';
import {
  cartTotalItemsSubtotal,
  effectiveShippingForVendor,
} from '@/lib/shop/cart-store';

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
}

/**
 * 依廠商分組並計算各廠運費（與 create-newebpay-payment 規則一致）。
 */
export function calcVendorShippingSummaries(
  lines: CartLine[],
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
    const itemsSubtotal = group.reduce(
      (s, l) => s + l.unitPrice * l.qty,
      0,
    );
    const roundedSub = Math.round(itemsSubtotal);
    const eff = effectiveShippingForVendor(
      roundedSub,
      first.shippingFee,
      first.freeShippingThreshold,
    );
    const gapToFree =
      first.freeShippingThreshold == null ? null
      : eff === 0 ? null
      : Math.max(0, first.freeShippingThreshold - roundedSub);

    out.push({
      vendorId: first.vendorId,
      vendorName: first.vendorName,
      lines: group,
      itemsSubtotal: roundedSub,
      shippingFee: first.shippingFee,
      freeShippingThreshold: first.freeShippingThreshold,
      effectiveShipping: eff,
      gapToFreeShipping: gapToFree,
    });
  }

  return out.sort((a, b) => a.vendorName.localeCompare(b.vendorName, 'zh-Hant'));
}

export function cartTotalShipping(summaries: VendorShippingSummary[]): number {
  return summaries.reduce((s, v) => s + v.effectiveShipping, 0);
}

export function cartGrandTotal(lines: CartLine[]): number {
  const summaries = calcVendorShippingSummaries(lines);
  return cartTotalItemsSubtotal(lines) + cartTotalShipping(summaries);
}
