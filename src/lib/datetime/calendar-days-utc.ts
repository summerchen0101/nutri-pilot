/**
 * 純曆日 YYYY-MM-DD 加減（用 UTC 年月日，不依伺服器本地時區）。
 */
export function addCalendarDaysToIsoDateUtc(
  isoDate: string,
  deltaDays: number,
): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`addCalendarDaysToIsoDateUtc: invalid iso ${isoDate}`);
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
