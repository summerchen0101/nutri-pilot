export const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
] as const;

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: '久坐（幾乎不運動）' },
  { value: 'light', label: '輕度（每週 1–3 次）' },
  { value: 'moderate', label: '中度（每週 3–5 次）' },
  { value: 'active', label: '高度（每週 6–7 次）' },
  { value: 'very_active', label: '運動員 / 重度勞動' },
] as const;

export const DIET_TYPE_OPTIONS = [
  { value: 'omnivore', label: '一般飲食' },
  { value: 'vegetarian', label: '蛋奶素' },
  { value: 'vegan', label: '全素' },
] as const;

export const ALLERGEN_OPTIONS = [
  { value: 'shellfish', label: '甲殼類（蝦、蟹）' },
  { value: 'peanuts', label: '花生' },
  { value: 'gluten', label: '麩質' },
  { value: 'dairy', label: '乳製品' },
  { value: 'eggs', label: '蛋' },
  { value: 'soy', label: '大豆' },
  { value: 'tree_nuts', label: '木本堅果' },
] as const;

export const GOAL_TYPE_OPTIONS = [
  { value: 'lose_weight', label: '減重' },
  { value: 'gain_muscle', label: '增肌' },
  { value: 'maintain', label: '維持體態' },
] as const;

export const DIET_METHOD_OPTIONS = [
  {
    value: 'mediterranean',
    label: '地中海飲食',
    desc: '蔬果、橄欖油、魚類與全穀為主。',
  },
  {
    value: 'keto',
    label: '生酮（Keto）',
    desc: '極低碳水、適量蛋白與脂肪。',
  },
  {
    value: 'high_protein',
    label: '高蛋白',
    desc: '拉高蛋白比例，適合增肌與飽足感。',
  },
  {
    value: 'low_cal',
    label: '低熱量',
    desc: '控制總熱量，適合減重。',
  },
  {
    value: 'intermittent',
    label: '間歇性斷食',
    desc: '在固定時段進食。',
  },
  {
    value: 'dash',
    label: 'DASH',
    desc: '強調蔬果與低脂乳製品，適合心血管健康。',
  },
  {
    value: 'custom',
    label: '自訂／彈性',
    desc: '依你的習慣自由搭配。',
  },
] as const;

export const DURATION_OPTIONS = [7, 14, 21, 30] as const;
