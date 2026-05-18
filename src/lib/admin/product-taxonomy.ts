export const PRODUCT_CATEGORIES = [
  'nuts',
  'protein_bar',
  'supplement',
  'drink',
  'snack',
  'meal_replacement',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const DIET_TAG_OPTIONS = [
  { value: 'mediterranean', label: '地中海' },
  { value: 'keto', label: '生酮' },
  { value: 'high_protein', label: '高蛋白' },
  { value: 'low_cal', label: '低卡' },
  { value: 'intermittent', label: '間歇斷食' },
  { value: 'dash', label: 'DASH' },
] as const;

export const CERT_TAG_OPTIONS = [
  { value: 'organic', label: '有機' },
  { value: 'non_gmo', label: '非基改' },
  { value: 'iso22000', label: 'ISO 22000' },
  { value: 'gluten_free', label: '無麩質' },
] as const;

export const ALLERGEN_FREE_OPTIONS = [
  { value: 'peanut', label: '花生' },
  { value: 'shellfish', label: '甲殼類' },
  { value: 'gluten', label: '麩質' },
  { value: 'dairy', label: '乳製品' },
  { value: 'eggs', label: '蛋' },
  { value: 'soy', label: '大豆' },
  { value: 'tree_nuts', label: '堅果類' },
] as const;
