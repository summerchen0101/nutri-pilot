import type { PersonalContextFacets } from '@/lib/personal-context/types';

import { bmiStatusText, dietMethodLabel } from './formatters';

function hasPersonalContextContent(
  facets: PersonalContextFacets | null,
): boolean {
  if (!facets) return false;
  const lists = [
    facets.conditions,
    facets.family_history,
    facets.current_state,
    facets.diet_preferences_extra,
    facets.medications_supplements,
    facets.other,
  ];
  if (lists.some((arr) => arr.some((s) => s.trim().length > 0))) return true;
  return Boolean(facets.summary_zh?.trim());
}

export function healthSectionSummary(params: {
  heightCmDisplay: string;
  bmiValue: number | null;
  dailyCalTarget: number;
}): string {
  const bmiLabel = bmiStatusText(params.bmiValue);
  const heightPart =
    params.heightCmDisplay.trim().length > 0 ? `${params.heightCmDisplay} cm` : '身高未填';
  const cal = Math.round(params.dailyCalTarget).toLocaleString();
  return `${heightPart} · BMI ${bmiLabel} · 目標 ${cal} kcal`;
}

export function dietSectionSummary(params: {
  dietMethod: string;
  allergenLine: string;
  personalContextFacets: PersonalContextFacets | null;
}): string {
  const method = dietMethodLabel(params.dietMethod);
  const pulse = hasPersonalContextContent(params.personalContextFacets)
    ? '已設定'
    : '未設定';
  return `${method} · ${params.allergenLine} · 脈絡 ${pulse}`;
}

export function shopSectionSummary(balance: number): string {
  return `${balance.toLocaleString()} 點可用`;
}

export function accountSectionSummary(params: {
  planLabel: string;
  usagePercent: number;
}): string {
  const pct = Math.round(params.usagePercent * 10) / 10;
  return `${params.planLabel} · 本月用量約 ${pct}%`;
}
