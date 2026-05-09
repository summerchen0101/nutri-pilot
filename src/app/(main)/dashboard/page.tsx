import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import {
  DashboardBrandsSkeleton,
  DashboardHome,
  type DashboardHomeProps,
  DashboardRecommendationSkeleton,
} from '@/app/(main)/dashboard/dashboard-home';
import {
  aggregateKcalByDate,
  buildInsightBullets,
  buildMealRows,
  buildWeeklyTrend,
  computeGoalMetStreak,
  hasUnreadAnnouncementsForUser,
  normalizeDashboardUserName,
  summarizeActivityTypesForToday,
  sumNutrientsFromLogs,
} from '@/app/(main)/dashboard/dashboard-helpers';
import {
  DashboardPopularBrandsDeferred,
  DashboardRecommendedProductsDeferred,
} from '@/app/(main)/dashboard/dashboard-shop-stream';
import { getCachedAuthContext } from '@/lib/auth';
import { getCachedUserProfileCoreRow } from '@/lib/user-profile';
import { round1 } from '@/lib/food/nutrition';
import {
  MILESTONE_LABELS,
  syncUserMilestones,
} from '@/lib/milestones/sync-user-milestones';
import { DIET_METHOD_OPTIONS } from '@/lib/onboarding/constants';
import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';

/** 首頁飲水進度目標（ml）；Schema 尚無使用者欄位時僅供 UI */
const DASHBOARD_WATER_TARGET_ML = 2000;

export default async function DashboardPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const today = todayLocalISODate();
  const weekStart = addCalendarDaysISO(today, -6);
  const streakWindowStart = addCalendarDaysISO(today, -120);

  const [
    { data: profile, error: profileError },
    { data: latestVitalRows },
    { data: goal },
    { data: foodLogsStreakWindow },
    { data: weekVitalRows },
    { data: activityRowsToday },
    { data: todayVitalRow },
    hasUnreadAnnouncements,
  ] = await Promise.all([
    getCachedUserProfileCoreRow(supabase, user.id),
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
      date,
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
      .from('activity_logs')
      .select('duration_minutes, calories_est, activity_type')
      .eq('user_id', user.id)
      .eq('logged_date', today),
    supabase
      .from('vital_logs')
      .select('water_ml')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
    hasUnreadAnnouncementsForUser(supabase, user.id),
  ]);

  if (profileError || !profile) redirect('/onboarding');

  const foodLogsCombined = foodLogsStreakWindow ?? [];
  const foodRows = foodLogsCombined.filter((r) => r.date === today);
  const streakFoodRows = foodLogsCombined;
  const weekFoodRows = foodLogsCombined.filter(
    (r) => r.date != null && r.date >= weekStart && r.date <= today,
  );

  await syncUserMilestones(supabase, user.id);

  const { data: milestoneRows } = await supabase
    .from('user_milestones')
    .select('milestone_key, unlocked_at')
    .eq('user_id', user.id)
    .order('unlocked_at', { ascending: false })
    .limit(6);

  const milestoneChips = (milestoneRows ?? []).map((r) => ({
    key: r.milestone_key,
    label: MILESTONE_LABELS[r.milestone_key] ?? r.milestone_key,
  }));

  const waterMlRaw = todayVitalRow?.water_ml;
  const waterMlToday =
    waterMlRaw != null && Number.isFinite(Number(waterMlRaw)) ?
      Math.max(0, Math.round(Number(waterMlRaw)))
    : 0;

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
  const weeklyTrend = buildWeeklyTrend(
    weekStart,
    today,
    weekVitalRows ?? [],
    weekFoodRows ?? [],
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
    if (
      row.calories_est != null &&
      Number.isFinite(Number(row.calories_est))
    ) {
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
    todayKcal: nutrientTotals.kcal,
    targetKcal,
    carbG: nutrientTotals.carb,
    proteinG: nutrientTotals.protein,
    fatG: nutrientTotals.fat,
    todayIsoDate: today,
    meals: buildMealRows(foodRows ?? [], today),
    weeklyWeight: weeklyTrend.weightRows,
    weeklyKcal: weeklyTrend.kcalRows,
    insightBullets,
    recommendSlot: (
      <Suspense fallback={<DashboardRecommendationSkeleton />}>
        <DashboardRecommendedProductsDeferred
          dietMethod={profile.diet_method ?? null}
          dietMethodLabel={dietMethodLabel}
        />
      </Suspense>
    ),
    promoBanner: {
      title: '本週補給推薦',
      description: '依你的飲食偏好精選 3 款熱門商品，現在前往查看。',
      ctaLabel: '前往商城',
      href: '/shop',
    },
    popularBrandsSlot: (
      <Suspense fallback={<DashboardBrandsSkeleton />}>
        <DashboardPopularBrandsDeferred />
      </Suspense>
    ),
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
