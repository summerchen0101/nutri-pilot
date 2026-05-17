/**
 * For catalog cards: among variants at the minimum sale price, return the max list_price
 * to show struck-through when it is greater than that variant's `price`.
 */
export function catalogListStrikePrice(
  variants: Array<{ price: number; list_price: number | null }>,
): number | null {
  if (variants.length === 0) return null;
  const minPrice = Math.min(...variants.map((v) => v.price));
  const atFloor = variants.filter((v) => v.price === minPrice);
  const candidates = atFloor
    .map((v) => v.list_price)
    .filter(
      (lp): lp is number =>
        lp != null && Number.isFinite(lp) && lp > minPrice,
    );
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

/** Single variant: struck-through list price when valid and above sale `price`. */
export function variantListStrikePrice(
  salePrice: number,
  listPrice: number | null,
): number | null {
  if (listPrice == null || !Number.isFinite(listPrice)) return null;
  if (!Number.isFinite(salePrice) || listPrice <= salePrice) return null;
  return listPrice;
}
