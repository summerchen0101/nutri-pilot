export const SHOP_CATEGORY_ICON_KEYS = [
  'nuts',
  'protein_bar',
  'supplement',
  'drink',
  'snack',
  'meal_replacement',
  'default',
] as const;

export type ShopCategoryIconKey = (typeof SHOP_CATEGORY_ICON_KEYS)[number];

export const SHOP_CATEGORY_ICON_LABELS: Record<ShopCategoryIconKey, string> = {
  nuts: '堅果',
  protein_bar: '蛋白棒',
  supplement: '保健品',
  drink: '飲品',
  snack: '點心',
  meal_replacement: '代餐',
  default: '預設',
};

export function isShopCategoryIconKey(value: string): value is ShopCategoryIconKey {
  return (SHOP_CATEGORY_ICON_KEYS as readonly string[]).includes(value);
}
