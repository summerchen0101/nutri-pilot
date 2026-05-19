/** ≥ 最高熱量此比例視為「接近最高」（未超過時）— 與 Dashboard 圓環一致 */
export const CALORIE_NEAR_MAX_RATIO = 0.9;

export type CalorieIntakeStatus = 'default' | 'near' | 'over';

const RING_STROKE_BY_STATUS: Record<CalorieIntakeStatus, string> = {
  default: '#4C956C',
  near: '#EF9F27',
  over: '#E24B4A',
};

const TEXT_CLASS_BY_STATUS: Record<CalorieIntakeStatus, string> = {
  default: 'text-foreground',
  near: 'text-[#EF9F27]',
  over: 'text-[#E24B4A]',
};

export function getCalorieIntakeStatus(
  consumedKcal: number,
  targetKcal: number | null,
): CalorieIntakeStatus {
  const target =
    targetKcal != null && Number.isFinite(targetKcal) && targetKcal > 0
      ? targetKcal
      : 0;
  if (target <= 0) return 'default';
  if (consumedKcal > target) return 'over';
  if (
    consumedKcal > 0 &&
    consumedKcal <= target &&
    consumedKcal >= target * CALORIE_NEAR_MAX_RATIO
  ) {
    return 'near';
  }
  return 'default';
}

export function getCalorieIntakeTextClass(status: CalorieIntakeStatus): string {
  return TEXT_CLASS_BY_STATUS[status];
}

export function getCalorieIntakeRingStroke(status: CalorieIntakeStatus): string {
  return RING_STROKE_BY_STATUS[status];
}
