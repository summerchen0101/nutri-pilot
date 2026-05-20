'use client';

import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import {
  getMealRecordStreakTierProgress,
  MEAL_RECORD_STREAK_TIERS,
} from '@/lib/dashboard/meal-record-streak-tiers';

const MEAL_RECORD_STREAK_RULE_HINT =
  '每日早、中、晚皆有飲食紀錄即算 1 日；自昨日起累計，今日尚未記完不影響已累積天數。';

interface DashboardMealRecordStreakSheetProps {
  open: boolean;
  onClose: () => void;
  streakDays: number;
}

export function DashboardMealRecordStreakSheet({
  open,
  onClose,
  streakDays,
}: DashboardMealRecordStreakSheetProps) {
  return (
    <BottomSheetShell open={open} title="連續紀錄獎勵" onClose={onClose}>
      <ul className="space-y-4">
        {MEAL_RECORD_STREAK_TIERS.map((tier) => {
          const { progressPct, displayDays, isUnlocked } =
            getMealRecordStreakTierProgress(streakDays, tier.days);

          return (
            <li key={tier.days}>
              <MealRecordStreakTierRow
                tierDays={tier.days}
                rewardLabel={tier.rewardLabel}
                progressPct={progressPct}
                displayDays={displayDays}
                isUnlocked={isUnlocked}
              />
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-caption leading-relaxed text-muted-foreground">
        {MEAL_RECORD_STREAK_RULE_HINT}
      </p>
    </BottomSheetShell>
  );
}

function MealRecordStreakTierRow({
  tierDays,
  rewardLabel,
  progressPct,
  displayDays,
  isUnlocked,
}: {
  tierDays: number;
  rewardLabel: string;
  progressPct: number;
  displayDays: number;
  isUnlocked: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-body font-medium text-foreground">
          連續紀錄 {tierDays} 日
        </p>
        <span className="shrink-0 text-caption text-muted-foreground">
          {isUnlocked ? '已解鎖' : `${displayDays} / ${tierDays} 日`}
        </span>
      </div>
      <p className="mb-2 text-caption text-muted-foreground">{rewardLabel}</p>
      <div className="h-[5px] w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
