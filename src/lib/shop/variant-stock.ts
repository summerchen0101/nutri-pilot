/**
 * 庫存欄位語意：null = 未建庫存上限（可下單）；0 = 無庫存；正整數 = 可賣數量上限
 */
export function isVariantSelectable(stock: number | null): boolean {
  if (stock === null) return true;
  return stock > 0;
}

/**
 * 單次下單數量上限；`undefined` = 無上限（庫存為 null）
 */
export function getVariantMaxOrderQty(
  stock: number | null,
): number | undefined {
  if (stock === null) return undefined;
  if (stock < 1) return undefined;
  return stock;
}

/**
 * Prefer the selectable variant with the lowest `price`; ties keep the earlier
 * index in `variants`. If none selectable, `variants[0]?.id ?? ''`.
 */
export function getPreferredSelectableVariantId(
  variants: Array<{ id: string; price: number; stock: number | null }>,
): string {
  if (variants.length === 0) return '';
  let bestIdx = -1;
  let bestPrice = Infinity;
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (!isVariantSelectable(v.stock)) continue;
    const p = Number(v.price);
    if (p < bestPrice) {
      bestPrice = p;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) return variants[bestIdx].id;
  return variants[0]?.id ?? '';
}
