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
