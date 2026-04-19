/** 本地日期的 ISO `YYYY-MM-DD`（不含時區位移）。 */
export function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `isoDate` 加 `deltaDays` 個日曆日，回傳 ISO 日期字串。 */
export function addCalendarDaysISO(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Inclusive range of ISO calendar dates from `start` through `end`. */
export function iterateISODatesInclusive(start: string, end: string): string[] {
  if (start > end) return [];
  const out: string[] = [];
  let cur = start;
  for (;;) {
    out.push(cur);
    if (cur >= end) break;
    cur = addCalendarDaysISO(cur, 1);
  }
  return out;
}
