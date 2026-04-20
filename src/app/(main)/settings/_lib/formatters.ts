import { ALLERGEN_OPTIONS, DIET_METHOD_OPTIONS, GOAL_TYPE_OPTIONS } from '@/lib/onboarding/constants';

export function goalTypeLabel(value: string): string {
  return GOAL_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function dietMethodLabel(value: string): string {
  return DIET_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function bmiTone(bmi: number | null): string {
  if (bmi == null) return 'text-neutral-text-secondary';
  if (bmi < 18.5) return 'text-blue-400';
  if (bmi < 25) return 'text-primary';
  if (bmi < 30) return 'text-amber-400';
  return 'text-destructive';
}

export function bmiStatusText(bmi: number | null): string {
  if (bmi == null) return '尚未計算';
  if (bmi < 18.5) return '偏輕';
  if (bmi < 25) return '健康';
  if (bmi < 30) return '過重';
  return '肥胖';
}

export function formatDate(value: string | null): string {
  if (!value) return '-';
  return value.replaceAll('-', '/');
}

export function formatAllergenLabel(value: string): string {
  if (value === 'shellfish') return '蝦';
  if (value === 'peanuts') return '花生';
  return ALLERGEN_OPTIONS.find((item) => item.value === value)?.label ?? value;
}
