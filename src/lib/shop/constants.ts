/**
 * 商城頁 `StickyPageHeader`／`PageHeader` 的 `id`，供捲動錨點或觀察用途。
 */
export const SHOP_HEADER_SCROLL_ANCHOR_ID = 'shop-header-scroll-anchor';

/**
 * 次要 sticky（分類／詳情資訊分頁）的 `top`，須與 `StickyPageHeaderShell` 的
 * `pt-[max(0.25rem,env(safe-area-inset-top))]` 加上 `PageHeader` 主列 `min-h-12`（3rem）一致；
 * Icon 區仍多為 `h-9`，置中對齊主列。
 */
export const SHOP_UNDER_HEADER_STICKY_TOP_CLASS =
  'top-[calc(max(0.25rem,env(safe-area-inset-top))+3rem)]';

/** 商城分類 tab（對應 products.category） */
export const SHOP_CATEGORY_KEYS = [
  'all',
  'nuts',
  'protein_bar',
  'supplement',
  'drink',
  'snack',
  'meal_replacement',
] as const;

export type ShopCategoryKey = (typeof SHOP_CATEGORY_KEYS)[number];

export const SHOP_CATEGORY_LABEL: Record<
  Exclude<ShopCategoryKey, 'all'>,
  string
> = {
  nuts: '堅果',
  protein_bar: '蛋白棒',
  supplement: '保健品',
  drink: '飲品',
  snack: '點心',
  meal_replacement: '代餐',
};
