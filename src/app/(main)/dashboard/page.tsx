import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import {
  DashboardBrandsSkeleton,
  DashboardHome,
  type DashboardHomeProps,
  DashboardInsightSkeleton,
  DashboardRecommendationSkeleton,
} from '@/app/(main)/dashboard/dashboard-home';
import {
  DashboardDailyInsightDeferred,
} from '@/app/(main)/dashboard/dashboard-insight-stream';
import {
  buildMealRows,
  buildMealTypesByDate,
  computeMealCompleteStreakFromYesterday,
  hasUnreadAnnouncementsForUser,
  normalizeDashboardUserName,
  summarizeActivityTypesForToday,
  sumNutrientsFromLogs,
} from '@/app/(main)/dashboard/dashboard-helpers';
import { pickRandomStreakZeroMessage } from '@/lib/dashboard/streak-zero-messages';
import {
  DashboardPopularBrandsDeferred,
  DashboardRecommendedProductsDeferred,
} from '@/app/(main)/dashboard/dashboard-shop-stream';
import { getCachedAuthContext } from '@/lib/auth';
import { getCachedUserProfileCoreRow } from '@/lib/user-profile';
import { round1 } from '@/lib/food/nutrition';
import { syncUserMilestones } from '@/lib/milestones/sync-user-milestones';
import { DIET_METHOD_OPTIONS } from '@/lib/onboarding/constants';
import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';

/** 首頁飲水進度目標（ml）；Schema 尚無使用者欄位時僅供 UI */
const DASHBOARD_WATER_TARGET_ML = 2000;

export default async function DashboardPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const today = todayLocalISODate();
  const streakWindowStart = addCalendarDaysISO(today, -120);

  const [
    { data: profile, error: profileError },
    { data: latestVitalRows },
    { data: goal },
    { data: foodLogsStreakWindow },
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
        fat_g,
        sodium_mg
      )
    `,
      )
      .eq('user_id', user.id)
      .gte('date', streakWindowStart)
      .lte('date', today),
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

  await syncUserMilestones(supabase, user.id);

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
  const dietMethodLabel =
    DIET_METHOD_OPTIONS.find((option) => option.value === profile.diet_method)?.label ??
    profile.diet_method ??
    '目前飲食設定';

  const mealTypesByDate = buildMealTypesByDate(streakFoodRows ?? []);
  const mealCompleteStreakDays = computeMealCompleteStreakFromYesterday(
    today,
    mealTypesByDate,
  );
  const streakZeroMotivation =
    mealCompleteStreakDays < 1 ? pickRandomStreakZeroMessage() : null;

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
    mealCompleteStreakDays,
    streakZeroMotivation,
    todayKcal: nutrientTotals.kcal,
    targetKcal,
    carbG: nutrientTotals.carb,
    proteinG: nutrientTotals.protein,
    fatG: nutrientTotals.fat,
    sodiumMgToday: nutrientTotals.sodiumMg,
    todayIsoDate: today,
    meals: buildMealRows(foodRows ?? [], today),
    insightSlot: (
      <Suspense fallback={<DashboardInsightSkeleton />}>
        <DashboardDailyInsightDeferred />
      </Suspense>
    ),
    recommendSlot: (
      <Suspense fallback={<DashboardRecommendationSkeleton />}>
        <DashboardRecommendedProductsDeferred
          dietMethod={profile.diet_method ?? null}
          dietMethodLabel={dietMethodLabel}
          usePersonalizedScores={profile.shop_personalize_recommendations !== false}
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
    waterMlToday,
    waterTargetMl: DASHBOARD_WATER_TARGET_ML,
    activityMinutesToday,
    activityKcalEstToday,
    activityTypesLabel,
  };

  return <DashboardHome {...homeProps} />;
}
