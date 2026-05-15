export type MembershipPlan = 'free' | 'plus' | 'pro';

/** 假設 1 USD ≈ 32 NT，將原 NT$/月 預算換成 AI 額度（×3000）。 */
const USD_PER_NTD_ASSUMED = 1 / 32;
const AI_QUOTA_PER_USD = 3000;

function ntdMonthlyBudgetToAiQuota(ntd: number): number {
  return Math.round(ntd * USD_PER_NTD_ASSUMED * AI_QUOTA_PER_USD);
}

/** 每月 AI 額度上限（與原 free/plus/pro 的 NT 方案強度對齊）。 */
export function getAiMonthlyCapUnits(plan: MembershipPlan): number {
  switch (plan) {
    case 'free':
      return ntdMonthlyBudgetToAiQuota(10);
    case 'plus':
      return ntdMonthlyBudgetToAiQuota(50);
    case 'pro':
      return ntdMonthlyBudgetToAiQuota(100);
  }
}

export function membershipPlanLabel(plan: MembershipPlan): string {
  switch (plan) {
    case 'free':
      return '免費';
    case 'plus':
      return '進階';
    case 'pro':
      return '專業';
  }
}

export function normalizeMembershipPlan(
  raw: string | null | undefined,
): MembershipPlan {
  if (raw === 'plus' || raw === 'pro' || raw === 'free') {
    return raw;
  }
  return 'free';
}

export function aiUsagePercentUsed(usedUnits: number, capUnits: number): number {
  if (capUnits <= 0) return 0;
  return Math.min(100, Math.round((usedUnits / capUnits) * 100));
}
