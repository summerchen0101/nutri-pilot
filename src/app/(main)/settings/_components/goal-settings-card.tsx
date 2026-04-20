import { SectionCard } from '@/components/ui/section-card';

import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';

interface GoalSettingsCardProps {
  goalTypeText: string;
  targetWeightText: string;
  weeklyRateText: string;
  dailyCalTargetText: string;
  targetDateText: string;
  error?: string | null;
  onOpenGoalType: () => void;
  onOpenGoalWeight: () => void;
  onOpenGoalWeeklyRate: () => void;
  onOpenGoalDailyCal: () => void;
  onOpenGoalTargetDate: () => void;
}

export function GoalSettingsCard({
  goalTypeText,
  targetWeightText,
  weeklyRateText,
  dailyCalTargetText,
  targetDateText,
  error,
  onOpenGoalType,
  onOpenGoalWeight,
  onOpenGoalWeeklyRate,
  onOpenGoalDailyCal,
  onOpenGoalTargetDate,
}: GoalSettingsCardProps) {
  return (
    <SectionCard className="bg-neutral-bg-primary">
      <div className="mb-1 text-[15px] font-medium text-foreground">飲控目標</div>
      <SettingsRow label="目標類型" value={goalTypeText} onClick={onOpenGoalType} />
      <SettingsRow label="目標體重" value={targetWeightText} onClick={onOpenGoalWeight} />
      <SettingsRow label="每週速率" value={weeklyRateText} onClick={onOpenGoalWeeklyRate} />
      <SettingsRow
        label="每日熱量目標"
        value={dailyCalTargetText}
        trailing={
          <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
            自動
          </span>
        }
        onClick={onOpenGoalDailyCal}
      />
      <SettingsRow
        label="預計達標日"
        value={targetDateText}
        valueClassName="text-[13px] text-primary"
        withBorder={false}
        onClick={onOpenGoalTargetDate}
      />
      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
    </SectionCard>
  );
}
