/** 與 `activity_logs.activity_type` / `activity-actions` 的 ActivityType 鍵一致 */
export const ACTIVITY_TYPE_LABEL = {
  walk: '走路',
  run: '跑步',
  cycling: '單車',
  swimming: '游泳',
  cardio: '有氧',
  hiit: '間歇有氧',
  jump_rope: '跳繩',
  dance: '舞蹈有氧',
  basketball: '籃球',
  tennis: '網球',
  badminton: '羽球',
  strength: '重訓',
  yoga: '瑜珈',
  pilates: '皮拉提斯',
  stretching: '伸展',
  other: '其他',
} as const;

export type ActivityTypeLabelKey = keyof typeof ACTIVITY_TYPE_LABEL;

export function activityTypeLabelZh(raw: string): string {
  const key = raw.trim();
  if (key && Object.prototype.hasOwnProperty.call(ACTIVITY_TYPE_LABEL, key)) {
    return ACTIVITY_TYPE_LABEL[key as ActivityTypeLabelKey];
  }
  return key ? raw : '其他';
}
