import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';

/** 計畫區間內最近 7 個日曆日（錨點為今日，夾在 plan 起訖之間）。 */
export function sevenDayDatesInPlan(plan: {
  start_date: string;
  end_date: string;
}): string[] {
  const today = todayLocalISODate();
  const windowEnd = clampIsoDate(today, plan.start_date, plan.end_date);

  let windowStart = addCalendarDaysISO(windowEnd, -6);
  if (windowStart < plan.start_date) {
    windowStart = plan.start_date;
  }

  const dates: string[] = [];
  let cur = windowStart;
  while (cur <= windowEnd && dates.length < 7) {
    dates.push(cur);
    cur = addCalendarDaysISO(cur, 1);
  }
  return dates;
}

function clampIsoDate(d: string, lo: string, hi: string): string {
  if (d < lo) return lo;
  if (d > hi) return hi;
  return d;
}
