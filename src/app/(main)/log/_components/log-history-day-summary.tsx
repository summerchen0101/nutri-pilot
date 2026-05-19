import {
  getCalorieIntakeStatus,
  getCalorieIntakeTextClass,
} from '@/lib/calorie/calorie-intake-status';
import type { LogHistoryDayRow } from '@/lib/log/build-log-history-summaries';
import {
  buildLogHistorySummaryParts,
  type LogHistorySummaryPart,
} from '@/lib/log/log-date-label';
export interface LogHistoryDaySummaryProps {
  row: LogHistoryDayRow;
  dailyCalTarget: number | null;
}

function SummaryPart({
  part,
  dailyCalTarget,
}: {
  part: LogHistorySummaryPart;
  dailyCalTarget: number | null;
}) {
  if (part.kind === 'kcal') {
    const status = getCalorieIntakeStatus(part.kcalTotal, dailyCalTarget);
    return (
      <>
        <span className={getCalorieIntakeTextClass(status)}>
          {part.kcalTotal.toLocaleString('zh-TW')} kcal
        </span>
        {part.mealHint ? <span>{part.mealHint}</span> : null}
      </>
    );
  }
  return <span>{part.text}</span>;
}

export function LogHistoryDaySummary({
  row,
  dailyCalTarget,
}: LogHistoryDaySummaryProps) {
  const parts = buildLogHistorySummaryParts(row);
  if (parts.length === 0) {
    return <span>有紀錄</span>;
  }

  return (
    <span className="inline text-caption leading-normal text-muted-foreground">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? ' · ' : null}
          <SummaryPart part={part} dailyCalTarget={dailyCalTarget} />
        </span>
      ))}
    </span>
  );
}
