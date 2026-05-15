import type { PersonalContextFacets } from '@/lib/personal-context/types';

export type PersonalContextListKey = keyof Pick<
  PersonalContextFacets,
  | 'conditions'
  | 'family_history'
  | 'current_state'
  | 'diet_preferences_extra'
  | 'medications_supplements'
  | 'other'
>;

export const PERSONAL_CONTEXT_SECTION_LABELS: {
  key: PersonalContextListKey;
  label: string;
}[] = [
  { key: 'conditions', label: '疾病／慢性狀況（自述）' },
  { key: 'family_history', label: '家族史／遺傳相關' },
  { key: 'current_state', label: '當前狀況或階段' },
  { key: 'diet_preferences_extra', label: '飲食偏好補充' },
  { key: 'medications_supplements', label: '用藥／保健品留意' },
  { key: 'other', label: '其他' },
];

export function listForKey(
  facets: PersonalContextFacets,
  key: PersonalContextListKey,
): string[] {
  const v = facets[key];
  return Array.isArray(v) ? v : [];
}
