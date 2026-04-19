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
