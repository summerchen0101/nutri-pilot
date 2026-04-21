import type { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

import {
  DashboardHome,
  type DashboardHomeProps,
} from '@/app/(main)/dashboard/dashboard-home';
import {
  MILESTONE_LABELS,
  syncUserMilestones,
} from '@/lib/milestones/sync-user-milestones';
import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';
import { activityTypeLabelZh } from '@/lib/activity/activity-type-labels';
import { DIET_METHOD_OPTIONS } from '@/lib/onboarding/constants';
import { round1 } from '@/lib/food/nutrition';
import { createClient } from '@/lib/supabase/server';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const MEAL_LABEL: Record<(typeof MEAL_ORDER)[number], string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

/** 首頁飲水進度目標（ml）；Schema 尚無使用者欄位時僅供 UI */
const DASHBOARD_WATER_TARGET_ML = 2000;

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const today = todayLocalISODate();
  const weekStart = addCalendarDaysISO(today, -6);
  const streakWindowStart = addCalendarDaysISO(today, -120);

  const [
    { data: profile },
    { data: latestVitalRows },
    { data: goal },
    { data: foodRows },
    { data: streakFoodRows },
    { data: weekVitalRows },
    { data: weekFoodRows },
    { data: productScores },
    { data: productCatalog },
    { data: brandProductRows },
    { data: brandRows },
    { data: activityRowsToday },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('name, weight_kg, height_cm, bmi, diet_method')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('vital_logs')
      .select('weight_kg, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(2),
    supabase
      .from('user_goals')
      .select('daily_cal_target')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('food_logs')
      .select(
        `
      meal_type,
      food_log_items (
        name,
        calories,
        carb_g,
        protein_g,
        fat_g
      )
    `,
      )
      .eq('user_id', user.id)
      .eq('date', today),
    supabase
      .from('food_logs')
      .select(
        `
      date,
      food_log_items (
        calories
      )
    `,
      )
      .eq('user_id', user.id)
      .gte('date', streakWindowStart)
      .lte('date', today),
    supabase
      .from('vital_logs')
      .select('date, weight_kg')
      .eq('user_id', user.id)
      .gte('date', weekStart)
      .lte('date', today)
      .order('date', { ascending: true }),
    supabase
      .from('food_logs')
      .select(
        `
      date,
      food_log_items (
        calories
      )
    `,
      )
      .eq('user_id', user.id)
      .gte('date', weekStart)
      .lte('date', today),
    supabase
      .from('user_product_scores')
      .select('product_id, score')
      .eq('user_id', user.id),
    supabase
      .from('products')
      .select(
        `
      id,
      name,
      image_url,
      protein_g,
      sugar_g,
      diet_tags,
      cert_tags,
      avg_rating,
      variants:product_variants ( price )
    `,
      )
      .eq('is_active', true),
    supabase.from('products').select('brand_id').eq('is_active', true),
    supabase
      .from('brands')
      .select('id, name, slug, logo_url')
      .eq('is_active', true),
    supabase
      .from('activity_logs')
      .select('duration_minutes, calories_est, activity_type')
      .eq('user_id', user.id)
      .eq('logged_date', today),
  ]);

  if (!profile) redirect('/onboarding');

  await syncUserMilestones(supabase, user.id);

  const [{ data: milestoneRows }, { data: todayVitalRow }] =
    await Promise.all([
      supabase
        .from('user_milestones')
        .select('milestone_key, unlocked_at')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(6),
      supabase
        .from('vital_logs')
        .select('water_ml')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
    ]);

  const milestoneChips = (milestoneRows ?? []).map((r) => ({
    key: r.milestone_key,
    label: MILESTONE_LABELS[r.milestone_key] ?? r.milestone_key,
  }));

  const waterMlRaw = todayVitalRow?.water_ml;
  const waterMlToday =
    waterMlRaw != null && Number.isFinite(Number(waterMlRaw)) ?
      Math.max(0, Math.round(Number(waterMlRaw)))
    : 0;

  const hasUnreadAnnouncements = await hasUnreadAnnouncementsForUser(
    supabase,
    user.id,
  );

  const vitalRowsDesc = latestVitalRows ?? [];
  const latestVital = vitalRowsDesc[0];
  const latestWeightKg =
    latestVital?.weight_kg != null
      ? Number(latestVital.weight_kg)
      : Number(profile.weight_kg);
  const latestWeightDate = latestVital?.date ?? null;

  let weightDeltaKg: number | null = null;
  if (vitalRowsDesc.length >= 2) {
    const w0 = vitalRowsDesc[0]?.weight_kg;
    const w1 = vitalRowsDesc[1]?.weight_kg;
    if (w0 != null && w1 != null) {
      const a = Number(w0);
      const b = Number(w1);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        weightDeltaKg = round1(a - b);
      }
    }
  }

  const dateLabel = new Intl.DateTimeFormat('zh-Hant', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const targetKcal =
    goal?.daily_cal_target != null
      ? Number(goal.daily_cal_target)
      : null;

  const nutrientTotals = sumNutrientsFromLogs(foodRows ?? []);
  const weeklyTrend = buildWeeklyTrend(weekStart, today, weekVitalRows ?? [], weekFoodRows ?? []);
  const recommendationProducts = buildRecommendedProducts({
    products: productCatalog ?? [],
    scores: productScores ?? [],
    dietMethod: profile.diet_method ?? null,
  });
  const activeBrandCounts = new Map<string, number>();
  for (const row of brandProductRows ?? []) {
    const brandId = row.brand_id as string | null;
    if (!brandId) continue;
    activeBrandCounts.set(brandId, (activeBrandCounts.get(brandId) ?? 0) + 1);
  }
  const popularBrands = pickRandomBrands(
    (brandRows ?? []).filter((row) => activeBrandCounts.has(row.id as string)),
    8,
  );
  const insightBullets = buildInsightBullets({
    todayKcal: nutrientTotals.kcal,
    targetKcal,
    carbG: nutrientTotals.carb,
    proteinG: nutrientTotals.protein,
    fatG: nutrientTotals.fat,
  });
  const dietMethodLabel =
    DIET_METHOD_OPTIONS.find((option) => option.value === profile.diet_method)?.label ??
    profile.diet_method ??
    '目前飲食設定';

  const kcalByDate = aggregateKcalByDate(streakFoodRows ?? []);
  const streakDays =
    targetKcal != null && targetKcal > 0 ?
      computeGoalMetStreak(today, targetKcal, kcalByDate)
    : 0;

  let activityMinutesToday = 0;
  let activityKcalEstToday = 0;
  for (const row of activityRowsToday ?? []) {
    activityMinutesToday += Math.round(Number(row.duration_minutes) || 0);
    if (row.calories_est != null && Number.isFinite(Number(row.calories_est))) {
      activityKcalEstToday += Number(row.calories_est);
    }
  }
  activityKcalEstToday = Math.round(activityKcalEstToday);

  const activityTypesLabel = summarizeActivityTypesForToday(
    activityRowsToday ?? [],
  );

  const homeProps: DashboardHomeProps = {
    dateLabel,
    userName: normalizeDashboardUserName(profile.name),
    latestWeightKg: Number.isFinite(latestWeightKg) ? latestWeightKg : null,
    latestWeightDate,
    weightDeltaKg,
    profileBmi: profile.bmi != null ? Number(profile.bmi) : null,
    streakDays,
    todayIsoDate: today,
    meals: buildMealRows(foodRows ?? [], today),
    weeklyWeight: weeklyTrend.weightRows,
    weeklyKcal: weeklyTrend.kcalRows,
    insightBullets,
    recommendProducts: recommendationProducts.map((row) => ({
      ...row,
      reason: row.reason ?? `符合${dietMethodLabel}偏好`,
    })),
    promoBanner: {
      title: '本週補給推薦',
      description: '依你的飲食偏好精選 3 款熱門商品，現在前往查看。',
      ctaLabel: '前往商城',
      href: '/shop',
    },
    popularBrands: popularBrands.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      logoUrl: row.logo_url as string | null,
    })),
    hasUnreadAnnouncements,
    milestoneChips,
    waterMlToday,
    waterTargetMl: DASHBOARD_WATER_TARGET_ML,
    activityMinutesToday,
    activityKcalEstToday,
    activityTypesLabel,
  };

  return <DashboardHome {...homeProps} />;
}

function summarizeActivityTypesForToday(
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

function normalizeDashboardUserName(value: unknown): string | null {
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

function buildWeeklyTrend(
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
    const total = (row.food_log_items ?? []).reduce((sum, item) => sum + Number(item.calories || 0), 0);
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

function macroTargetsFromKcal(
  kcal: number,
): { carb: number; protein: number; fat: number } {
  if (!Number.isFinite(kcal) || kcal <= 0) {
    return { carb: 0, protein: 0, fat: 0 };
  }
  return {
    carb: (kcal * 0.5) / 4,
    protein: (kcal * 0.25) / 4,
    fat: (kcal * 0.25) / 9,
  };
}

function buildInsightBullets({
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
    if (diff > 100) bullets.push(`今日熱量距離目標尚差約 ${diff} kcal，可安排一份輕食補足。`);
    if (diff < -100) bullets.push(`今日熱量超出目標約 ${Math.abs(diff)} kcal，晚餐可選擇低油與高纖組合。`);
  }
  const target = targetKcal != null && targetKcal > 0 ? macroTargetsFromKcal(targetKcal) : null;
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

function buildRecommendedProducts({
  products,
  scores,
  dietMethod,
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
}): Array<{
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  reason: string | null;
}> {
  const scoreMap = new Map(scores.map((row) => [row.product_id, Number(row.score)]));
  const ranked = [...products].sort((a, b) => {
    const scoreDiff = (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0);
  });
  return ranked
    .filter((row) => (row.variants ?? []).length > 0)
    .slice(0, 6)
    .map((row) => {
      const minPrice = Math.min(...(row.variants ?? []).map((variant) => Number(variant.price)));
      let reason: string | null = null;
      if (dietMethod && (row.diet_tags ?? []).includes(dietMethod)) {
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
    log_type?: string;
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

function aggregateKcalByDate(
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

function computeGoalMetStreak(
  today: string,
  targetKcal: number,
  kcalByDate: Map<string, number>,
): number {
  let streak = 0;
  let cursor = today;
  for (;;) {
    if (!kcalByDate.has(cursor)) break;
    const kcal = kcalByDate.get(cursor)!;
    if (kcal > targetKcal) break;
    streak++;
    cursor = addCalendarDaysISO(cursor, -1);
  }
  return streak;
}

function sumMealKcal(
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

function buildMealRows(
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

function pickRandomBrands<
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

async function hasUnreadAnnouncementsForUser(
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
