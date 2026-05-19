import { getLogDateMode } from '@/lib/log/log-date-policy';
import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';

/** `/log` 頁首：今日為「每日紀錄」，補登／修改他日為「YYYY-MM-DD 紀錄」。 */
export function getLogPageTitle(
  activeDateIso: string,
  todayIso: string = todayLocalISODate(),
): string {
  if (getLogDateMode(activeDateIso, todayIso) === 'today') {
    return '每日紀錄';
  }
  return `${activeDateIso} 紀錄`;
}

/** 紀錄頁各區塊標題（今日／補登他日皆用「當日」）。 */
export const LOG_FOOD_LIST_TITLE = '當日紀錄';
export const LOG_WATER_SECTION_TITLE = '當日飲水';
export const LOG_ACTIVITY_LIST_TITLE = '當日運動';
export const LOG_KCAL_INTAKE_LABEL = '當日已攝取';

export function getLogFoodListTitle(): string {
  return LOG_FOOD_LIST_TITLE;
}

export function getLogWaterSectionTitle(): string {
  return LOG_WATER_SECTION_TITLE;
}

function parseLocalDate(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/** 列表／詳情標題：含相對詞（今天、昨天）與週幾。 */
export function formatLogDateHeading(
  iso: string,
  todayIso: string = todayLocalISODate(),
): string {
  const dt = parseLocalDate(iso);
  if (!dt) return iso;

  const base = dt.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  if (iso === todayIso) return `今天 · ${base}`;
  const yesterday = addCalendarDaysISO(todayIso, -1);
  if (iso === yesterday) return `昨天 · ${base}`;
  return base;
}

export function formatLogHistorySummaryLine(row: {
  kcalTotal: number;
  foodEntryCount: number;
  mealsWithLogs: string[];
  activityMinutes: number;
  activityCount: number;
  weightKg: number | null;
  hasWaterOrSleep: boolean;
}): string {
  const parts: string[] = [];

  if (row.foodEntryCount > 0 || row.kcalTotal > 0) {
    const mealHint =
      row.mealsWithLogs.length > 0
        ? ` · ${row.mealsWithLogs.join('、')}`
        : '';
    parts.push(`${row.kcalTotal.toLocaleString('zh-TW')} kcal${mealHint}`);
  }

  if (row.activityCount > 0) {
    parts.push(`運動 ${row.activityMinutes} 分`);
  }

  if (row.weightKg != null && Number.isFinite(row.weightKg)) {
    const w =
      row.weightKg % 1 === 0
        ? String(row.weightKg)
        : row.weightKg.toFixed(1);
    parts.push(`體重 ${w} kg`);
  } else if (row.hasWaterOrSleep) {
    parts.push('水分／睡眠');
  }

  return parts.length > 0 ? parts.join(' · ') : '有紀錄';
}
