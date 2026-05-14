import type { SupabaseClient } from '@supabase/supabase-js';

import type { DashboardHomeProps } from '@/app/(main)/dashboard/dashboard-home';
import { activityTypeLabelZh } from '@/lib/activity/activity-type-labels';
import { macroTargetsFromKcal } from '@/lib/dashboard/macro-targets';
import { addCalendarDaysISO } from '@/lib/onboarding/date';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const MEAL_LABEL: Record<(typeof MEAL_ORDER)[number], string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

export function summarizeActivityTypesForToday(
  rows: { activity_type: string }[],
): string | null {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const row of rows) {
    const raw = String(row.activity_type ?? '').trim();
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    labels.push(activityTypeLabelZh(raw));
  }
  return labels.length > 0 ? labels.join('、') : null;
}

export function normalizeDashboardUserName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function shortLabel(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  return `${month}/${day}`;
}

function iterateDates(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    out.push(cursor);
    cursor = addCalendarDaysISO(cursor, 1);
  }
  return out;
}

export function buildWeeklyTrend(
  weekStart: string,
  today: string,
  vitals: { date: string; weight_kg: number | null }[],
  foods: {
    date: string;
    food_log_items: { calories: number }[] | null;
  }[],
): {
  weightRows: { label: string; kg: number | null }[];
  kcalRows: { label: string; kcal: number }[];
} {
  const dates = iterateDates(weekStart, today);
  const weightMap = new Map<string, number>();
  for (const row of vitals) {
    if (row.date && row.weight_kg != null) {
      weightMap.set(row.date, Number(row.weight_kg));
    }
  }
  const kcalMap = new Map<string, number>();
  for (const row of foods) {
    const total = (row.food_log_items ?? []).reduce(
      (sum, item) => sum + Number(item.calories || 0),
      0,
    );
    kcalMap.set(row.date, (kcalMap.get(row.date) ?? 0) + Math.round(total));
  }
  return {
    weightRows: dates.map((date) => ({
      label: shortLabel(date),
      kg: weightMap.get(date) ?? null,
    })),
    kcalRows: dates.map((date) => ({
      label: shortLabel(date),
      kcal: kcalMap.get(date) ?? 0,
    })),
  };
}

export function buildInsightBullets({
  todayKcal,
  targetKcal,
  carbG,
  proteinG,
  fatG,
}: {
  todayKcal: number;
  targetKcal: number | null;
  carbG: number;
  proteinG: number;
  fatG: number;
}): string[] {
  const bullets: string[] = [];
  if (targetKcal != null && targetKcal > 0) {
    const diff = Math.round(targetKcal - todayKcal);
    if (diff > 100) {
      bullets.push(`今日熱量距離目標尚差約 ${diff} kcal，可安排一份輕食補足。`);
    }
    if (diff < -100) {
      bullets.push(
        `今日熱量超出目標約 ${Math.abs(diff)} kcal，晚餐可選擇低油與高纖組合。`,
      );
    }
  }
  const target =
    targetKcal != null && targetKcal > 0 ?
      macroTargetsFromKcal(targetKcal)
    : null;
  if (target) {
    if (proteinG < target.protein * 0.7) {
      bullets.push('蛋白質攝取偏低，建議加一份高蛋白食物提升飽足與恢復。');
    } else if (fatG > target.fat * 1.2) {
      bullets.push('脂肪攝取偏高，下一餐可優先清蒸或水煮料理。');
    } else if (carbG > target.carb * 1.2) {
      bullets.push('碳水比例略高，可把部分主食替換成蔬菜或豆類。');
    }
  }
  if (bullets.length === 0) {
    bullets.push('今天進度穩定，維持目前飲食節奏就很不錯。');
  }
  return bullets.slice(0, 2);
}

export function buildRecommendedProducts({
  products,
  scores,
  dietMethod,
  usePersonalizedScores = true,
}: {
  products: {
    id: string;
    name: string;
    image_url: string | null;
    protein_g: number;
    sugar_g: number | null;
    diet_tags: string[] | null;
    cert_tags: string[] | null;
    avg_rating: number | null;
    variants: { price: number }[] | null;
  }[];
  scores: { product_id: string; score: number }[];
  dietMethod: string | null;
  usePersonalizedScores?: boolean;
}): Array<{
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  reason: string | null;
}> {
  const scoreMap = usePersonalizedScores
    ? new Map(scores.map((row) => [row.product_id, Number(row.score)]))
    : new Map<string, number>();
  const ranked = [...products].sort((a, b) => {
    const scoreDiff = (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0);
  });
  return ranked
    .filter((row) => (row.variants ?? []).length > 0)
    .slice(0, 6)
    .map((row) => {
      const minPrice = Math.min(
        ...(row.variants ?? []).map((variant) => Number(variant.price)),
      );
      let reason: string | null = null;
      if (
        usePersonalizedScores &&
        dietMethod &&
        (row.diet_tags ?? []).includes(dietMethod)
      ) {
        reason = '符合你的飲食偏好';
      } else if (Number(row.protein_g) >= 15) {
        reason = '高蛋白補給';
      } else if (Number(row.sugar_g ?? 0) <= 5) {
        reason = '低糖日常';
      } else if ((row.cert_tags ?? []).includes('organic')) {
        reason = '有機認證';
      }
      return {
        id: row.id,
        name: row.name,
        imageUrl: row.image_url,
        price: Number.isFinite(minPrice) ? minPrice : 0,
        reason,
      };
    });
}

function sumNutrientsFromLogs(
  rows: {
    meal_type: string;
    food_log_items:
      | {
          name: string;
          calories: number;
          carb_g: number;
          protein_g: number;
          fat_g: number;
        }[]
      | null;
  }[],
): { kcal: number; carb: number; protein: number; fat: number } {
  let kcal = 0;
  let carb = 0;
  let protein = 0;
  let fat = 0;
  for (const row of rows) {
    for (const it of row.food_log_items ?? []) {
      kcal += Number(it.calories) || 0;
      carb += Number(it.carb_g) || 0;
      protein += Number(it.protein_g) || 0;
      fat += Number(it.fat_g) || 0;
    }
  }
  return { kcal, carb, protein, fat };
}

export { sumNutrientsFromLogs };

export function aggregateKcalByDate(
  rows: {
    date: string | null;
    food_log_items: { calories: number | string }[] | null;
  }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const d = row.date;
    if (!d) continue;
    let sum = map.get(d) ?? 0;
    for (const it of row.food_log_items ?? []) {
      sum += Number(it.calories) || 0;
    }
    map.set(d, sum);
  }
  return new Map(
    Array.from(map.entries(), ([d, v]) => [d, Math.round(v)] as const),
  );
}

export function computeGoalMetStreak(
  today: string,
  targetKcal: number,
  kcalByDate: Map<string, number>,
): number {
  let streak = 0;
  let cursor = today;
  for (;;) {
    if (!kcalByDate.has(cursor)) break;
    const kcal = kcalByDate.get(cursor);
    if (kcal === undefined || kcal > targetKcal) break;
    streak++;
    cursor = addCalendarDaysISO(cursor, -1);
  }
  return streak;
}

export function sumMealKcal(
  logs: {
    food_log_items: { calories: number | string }[] | null;
  }[],
): number {
  let t = 0;
  for (const log of logs) {
    for (const it of log.food_log_items ?? []) {
      t += Number(it.calories) || 0;
    }
  }
  return Math.round(t);
}

function mealItemNameSummary(
  logs: {
    food_log_items: { name: string }[] | null;
  }[],
): string {
  const parts: string[] = [];
  for (const log of logs) {
    for (const it of log.food_log_items ?? []) {
      const n = String(it.name ?? '').trim();
      if (n) parts.push(n);
    }
  }
  return parts.join(' · ');
}

export function buildMealRows(
  foodRows: {
    meal_type: string;
    food_log_items: { name: string; calories: number }[] | null;
  }[],
  today: string,
): DashboardHomeProps['meals'] {
  const rows: DashboardHomeProps['meals'] = [];

  for (const key of MEAL_ORDER) {
    const logsForType = foodRows.filter((r) => r.meal_type === key);
    const hasLog = logsForType.length > 0;
    const totalKcal = sumMealKcal(logsForType);
    const recordHref = `/log?date=${encodeURIComponent(today)}&tab=food&meal_type=${encodeURIComponent(key)}`;

    if (hasLog) {
      const summary = mealItemNameSummary(logsForType);
      rows.push({
        key,
        label: MEAL_LABEL[key],
        variant: 'self_logged',
        detailLine: summary || '自行記錄',
        kcal: totalKcal,
        recordHref,
      });
    } else {
      rows.push({
        key,
        label: MEAL_LABEL[key],
        variant: 'self_logged',
        detailLine: '尚無紀錄',
        kcal: null,
        recordHref,
      });
    }
  }

  return rows;
}

export function pickRandomBrands<
  T extends {
    id: string;
  },
>(rows: T[], maxCount: number): T[] {
  if (rows.length <= 1) return rows.slice(0, maxCount);
  const shuffled = [...rows];
  for (let idx = shuffled.length - 1; idx > 0; idx--) {
    const swapIdx = Math.floor(Math.random() * (idx + 1));
    const current = shuffled[idx];
    shuffled[idx] = shuffled[swapIdx];
    shuffled[swapIdx] = current;
  }
  return shuffled.slice(0, maxCount);
}

export async function hasUnreadAnnouncementsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { data: visible, error: visibleError } = await supabase
    .from('announcements')
    .select('id')
    .eq('is_active', true)
    .lte('published_at', nowIso);

  if (visibleError || !visible?.length) return false;

  const ids = visible.map((row) => row.id as string);
  const { data: reads, error: readsError } = await supabase
    .from('user_announcement_reads')
    .select('announcement_id')
    .eq('user_id', userId)
    .in('announcement_id', ids);

  if (readsError) return false;

  const readSet = new Set(
    (reads ?? []).map((row) => row.announcement_id as string),
  );
  return ids.some((id) => !readSet.has(id));
}
