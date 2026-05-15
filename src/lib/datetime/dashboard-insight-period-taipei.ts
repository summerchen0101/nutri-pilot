import { addCalendarDaysToIsoDateUtc } from '@/lib/datetime/calendar-days-utc';

const TAIPEI = 'Asia/Taipei';

function taipeiYmdhParts(now: Date): {
  y: string;
  m: string;
  d: string;
  hour: number;
} {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TAIPEI,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: Intl.DateTimeFormatPart['type']) =>
    parts.find((p) => p.type === t)?.value;
  const y = get('year');
  const m = get('month');
  const d = get('day');
  const hStr = get('hour');
  if (!y || !m || !d || hStr === undefined) {
    throw new Error('taipeiYmdhParts: invalid Intl parts');
  }
  const hour = Number.parseInt(hStr, 10);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    throw new Error('taipeiYmdhParts: invalid hour');
  }
  return { y, m, d, hour };
}

/** 同一時刻下定義的近 7 日結束日與快取週期錨點（只算一次 Intl）。 */
export function taipeiInsightWindowContext(now: Date = new Date()): {
  dataAsOfDate: string;
  periodDate: string;
} {
  const { y, m, d, hour } = taipeiYmdhParts(now);
  const dataAsOfDate = `${y}-${m}-${d}`;
  const periodDate =
    hour < 4 ?
      addCalendarDaysToIsoDateUtc(dataAsOfDate, -1)
    : dataAsOfDate;
  return { dataAsOfDate, periodDate };
}

/** Asia/Taipei 曆法的「今日」YYYY-MM-DD（與幾點無關）。 */
export function taipeiCalendarDateISO(now: Date = new Date()): string {
  return taipeiInsightWindowContext(now).dataAsOfDate;
}

/**
 * 首頁「今日建議」快取鍵：Taipei 每日 04:00 換線。
 * 當地 < 04:00 視為仍屬前一日週期；≥ 04:00 為當日週期。
 */
export function dashboardInsightPeriodDateTaipei(
  now: Date = new Date(),
): string {
  return taipeiInsightWindowContext(now).periodDate;
}
