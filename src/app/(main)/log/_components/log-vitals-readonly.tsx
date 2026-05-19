import type { LogVitalSnapshot } from '@/app/(main)/log/_components/log-vitals-card';
import { LOG_WATER_SECTION_TITLE } from '@/lib/log/log-date-label';

const LOG_PAGE_WATER_TARGET_ML = 2000;

function formatSleepHoursLabel(h: number | null): string {
  if (h == null || !Number.isFinite(h)) return '—';
  const r = Math.round(h * 10) / 10;
  return `${r % 1 === 0 ? String(r) : r.toFixed(1)} 小時`;
}

export function LogVitalsReadonly({ vital }: { vital: LogVitalSnapshot }) {
  const weightLabel =
    vital.weightKg != null && Number.isFinite(vital.weightKg)
      ? `${vital.weightKg % 1 === 0 ? vital.weightKg : vital.weightKg.toFixed(1)} kg`
      : '—';

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl bg-card px-4 py-3">
        <h2 className="mb-2 text-[15px] font-medium text-foreground">體重</h2>
        <p className="text-heading-page tabular-nums text-foreground">
          {weightLabel}
        </p>
      </div>
      <div className="rounded-xl bg-card px-4 py-3">
        <h2 className="mb-2 text-[15px] font-medium text-foreground">
          水分與睡眠
        </h2>
        <dl className="space-y-2 text-[13px] text-foreground">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{LOG_WATER_SECTION_TITLE}</dt>
            <dd className="tabular-nums">
              {vital.waterMl.toLocaleString('zh-TW')} /{' '}
              {LOG_PAGE_WATER_TARGET_ML.toLocaleString('zh-TW')} ml
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">睡眠</dt>
            <dd>{formatSleepHoursLabel(vital.sleepHours)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
