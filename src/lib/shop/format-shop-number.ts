const shopGroupedIntegerFormatter = new Intl.NumberFormat('zh-TW', {
  useGrouping: true,
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/**
 * 商城內一般整數顯示（千分位）。
 * 價格等需整數請先在外面 `Math.round` 再傳入。
 */
export function formatShopGroupedInteger(value: number): string {
  return shopGroupedIntegerFormatter.format(Math.round(value));
}

/**
 * 營養標等可能為小數的數值（千分位保留小數，最多 `maxFractionDigits` 位）。
 */
export function formatShopGroupedDecimal(
  value: number,
  maxFractionDigits: number,
): string {
  return new Intl.NumberFormat('zh-TW', {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}
