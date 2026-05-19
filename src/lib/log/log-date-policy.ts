import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';

export type LogDateMode = 'today' | 'yesterday_editable' | 'readonly';

export function isoDateOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** 今日與昨天可寫入／修改紀錄；更早日期唯讀。 */
export function getLogDateMode(
  dateIso: string,
  todayIso: string = todayLocalISODate(),
): LogDateMode {
  if (dateIso === todayIso) return 'today';
  const yesterday = addCalendarDaysISO(todayIso, -1);
  if (dateIso === yesterday) return 'yesterday_editable';
  return 'readonly';
}

export function isLogDateMutable(
  dateIso: string,
  todayIso: string = todayLocalISODate(),
): boolean {
  const mode = getLogDateMode(dateIso, todayIso);
  return mode === 'today' || mode === 'yesterday_editable';
}

/** Server Actions：不可變更日期時回傳錯誤訊息，否則 null。 */
export function logDateMutationError(
  dateIso: string,
  todayIso: string = todayLocalISODate(),
): string | null {
  if (!isoDateOk(dateIso)) return '日期格式無效';
  if (isLogDateMutable(dateIso, todayIso)) return null;
  return '僅能修改今日或昨日的紀錄';
}
