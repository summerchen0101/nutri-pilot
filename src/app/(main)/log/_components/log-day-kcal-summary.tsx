import {
  getCalorieIntakeStatus,
  getCalorieIntakeTextClass,
} from '@/lib/calorie/calorie-intake-status';
import { LOG_KCAL_INTAKE_LABEL } from '@/lib/log/log-date-label';
import { cn } from '@/lib/utils/cn';

export interface LogDayKcalSummaryProps {
  consumedKcal: number;
  dailyCalTarget: number | null;
  label?: string;
  dateLine?: string;
  showNoGoalHint?: boolean;
}

export function LogDayKcalSummary({
  consumedKcal,
  dailyCalTarget,
  label = LOG_KCAL_INTAKE_LABEL,
  dateLine,
  showNoGoalHint = false,
}: LogDayKcalSummaryProps) {
  const status = getCalorieIntakeStatus(consumedKcal, dailyCalTarget);
  const rounded = Math.round(consumedKcal);

  return (
    <div className="rounded-xl bg-card px-4 py-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p
            className={cn(
              'tabular-nums text-heading-page leading-tight',
              getCalorieIntakeTextClass(status),
            )}
          >
            {rounded}
            <span className="text-[13px] font-normal text-muted-foreground">
              {' '}
              kcal
            </span>
          </p>
        </div>
        <div className="text-right">
          {dailyCalTarget != null ? (
            <p className="text-[11px] text-muted-foreground">
              目標 {Math.round(Number(dailyCalTarget))} kcal
            </p>
          ) : showNoGoalHint ? (
            <p className="text-[11px] text-muted-foreground">尚未設定熱量目標</p>
          ) : null}
          {dateLine ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{dateLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
