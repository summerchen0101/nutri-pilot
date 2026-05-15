export type MembershipPlan = 'free' | 'plus' | 'pro';

/** 每月 AI 額度上限（新台幣，與使用者給定規格一致）。 */
export function getAiMonthlyCapNtd(plan: MembershipPlan): number {
  switch (plan) {
    case 'free':
      return 10;
    case 'plus':
      return 50;
    case 'pro':
      return 100;
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

export function aiUsagePercentUsed(usedNtd: number, capNtd: number): number {
  if (capNtd <= 0) return 0;
  return Math.min(100, Math.round((usedNtd / capNtd) * 100));
}
