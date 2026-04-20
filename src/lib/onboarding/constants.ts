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
    desc: '蔬果、全穀、健康脂肪為主',
  },
  {
    value: 'keto',
    label: '生酮飲食',
    desc: '低碳水、高脂肪，穩定醣類攝取',
  },
  {
    value: 'high_protein',
    label: '高蛋白',
    desc: '提高蛋白質比例，適合增肌與飽足感',
  },
  {
    value: 'low_cal',
    label: '低熱量',
    desc: '優先控制總熱量，協助減重',
  },
  {
    value: 'intermittent',
    label: '間歇性斷食',
    desc: '限制進食時段，幫助飲食節律',
  },
  {
    value: 'dash',
    label: 'DASH',
    desc: '蔬果與低鈉優先，支持心血管健康',
  },
  {
    value: 'custom',
    label: '無特定飲食法',
    desc: '無固定限制，依個人習慣彈性選擇',
  },
] as const;
