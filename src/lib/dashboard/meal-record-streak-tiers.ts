/** 首頁連續三餐紀錄獎勵 tier（僅 UI 文案，不發點） */
export const MEAL_RECORD_STREAK_TIERS = [
  { days: 7, rewardLabel: '解鎖連續紀錄 7 日成就' },
  { days: 14, rewardLabel: '解鎖連續紀錄 14 日成就' },
  { days: 30, rewardLabel: '解鎖連續紀錄 30 日成就' },
] as const;

export type MealRecordStreakTier = (typeof MEAL_RECORD_STREAK_TIERS)[number];

export function getMealRecordStreakTierProgress(
  streakDays: number,
  targetDays: number,
): { progressPct: number; displayDays: number; isUnlocked: boolean } {
  const safeTarget = Math.max(1, targetDays);
  const capped = Math.max(0, Math.min(streakDays, safeTarget));
  return {
    progressPct: Math.round((capped / safeTarget) * 100),
    displayDays: capped,
    isUnlocked: streakDays >= safeTarget,
  };
}
