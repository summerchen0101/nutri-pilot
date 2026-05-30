import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';

/** 不含今天；過去此天數內的日曆日可修改（昨天 = 1）。 */
export const LOG_MUTABLE_PAST_DAY_COUNT = 3;

export type LogDateMode = 'today' | 'recent_editable' | 'readonly';

export function isoDateOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** `dateIso` 距 `todayIso` 幾個日曆日以前；未來或無效則 -1。 */
export function calendarDaysAgo(
  dateIso: string,
  todayIso: string = todayLocalISODate(),
): number {
  if (!isoDateOk(dateIso) || !isoDateOk(todayIso)) return -1;
  if (dateIso > todayIso) return -1;

  let daysAgo = 0;
  let cur = dateIso;
  while (cur < todayIso) {
    cur = addCalendarDaysISO(cur, 1);
    daysAgo += 1;
  }
  return daysAgo;
}

/** 今日與過去 {@link LOG_MUTABLE_PAST_DAY_COUNT} 日可寫入；更早唯讀。 */
export function getLogDateMode(
  dateIso: string,
  todayIso: string = todayLocalISODate(),
): LogDateMode {
  const daysAgo = calendarDaysAgo(dateIso, todayIso);
  if (daysAgo < 0) return 'readonly';
  if (daysAgo === 0) return 'today';
  if (daysAgo <= LOG_MUTABLE_PAST_DAY_COUNT) return 'recent_editable';
  return 'readonly';
}

export function isLogDateMutable(
  dateIso: string,
  todayIso: string = todayLocalISODate(),
): boolean {
  const mode = getLogDateMode(dateIso, todayIso);
  return mode === 'today' || mode === 'recent_editable';
}

/** Server Actions：不可變更日期時回傳錯誤訊息，否則 null。 */
export function logDateMutationError(
  dateIso: string,
  todayIso: string = todayLocalISODate(),
): string | null {
  if (!isoDateOk(dateIso)) return '日期格式無效';
  if (isLogDateMutable(dateIso, todayIso)) return null;
  return '僅能修改今日或近 3 日的紀錄';
}
