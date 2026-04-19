import { redirect } from 'next/navigation';

import {
  DashboardHome,
  type DashboardHomeProps,
} from '@/app/(main)/dashboard/dashboard-home';
import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';
import { createClient } from '@/lib/supabase/server';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const MEAL_LABEL: Record<(typeof MEAL_ORDER)[number], string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const today = todayLocalISODate();
  const streakWindowStart = addCalendarDaysISO(today, -120);

  const [
    { data: profile },
    { data: latestVital },
    { data: goal },
    { data: plan },
    { data: foodRows },
    { data: logDateRows },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('name, weight_kg, height_cm, bmi')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('vital_logs')
      .select('weight_kg, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_goals')
      .select('daily_cal_target')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('diet_plans')
      .select('id')
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
      .select('date')
      .eq('user_id', user.id)
      .gte('date', streakWindowStart)
      .lte('date', today),
  ]);

  const { data: completedMenuRows } =
    plan?.id ?
      await supabase
        .from('daily_menus')
        .select('date')
        .eq('plan_id', plan.id)
        .eq('is_completed', true)
        .gte('date', streakWindowStart)
        .lte('date', today)
    : { data: [] as { date: string }[] | null };

  if (!profile) redirect('/onboarding');

  let menuRow: {
    meals: {
      type: string;
      is_checked_in: boolean | null;
      meal_items: { name: string }[] | null;
    }[];
  } | null = null;

  if (plan?.id) {
    const { data } = await supabase
      .from('daily_menus')
      .select(
        `
      meals (
        type,
        is_checked_in,
        meal_items ( name )
      )
    `,
      )
      .eq('plan_id', plan.id)
      .eq('date', today)
      .maybeSingle();
    menuRow = data as typeof menuRow;
  }

  const latestWeightKg =
    latestVital?.weight_kg != null
      ? Number(latestVital.weight_kg)
      : Number(profile.weight_kg);
  const latestWeightDate = latestVital?.date ?? null;

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

  const loggedDates = new Set(
    (logDateRows ?? []).map((r) => r.date).filter(Boolean),
  );
  const completedDates = new Set(
    (completedMenuRows ?? []).map((r) => r.date).filter(Boolean),
  );

  const streakDays = computeStreak(today, loggedDates, completedDates);

  const homeProps: DashboardHomeProps = {
    displayName: profile.name,
    dateLabel,
    latestWeightKg: Number.isFinite(latestWeightKg) ? latestWeightKg : null,
    latestWeightDate,
    heightCm: Number(profile.height_cm),
    profileBmi: profile.bmi != null ? Number(profile.bmi) : null,
    todayKcal: nutrientTotals.kcal,
    targetKcal,
    carbG: nutrientTotals.carb,
    proteinG: nutrientTotals.protein,
    fatG: nutrientTotals.fat,
    streakDays,
    meals: buildMealRows(menuRow, foodRows ?? []),
  };

  return <DashboardHome {...homeProps} />;
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

function computeStreak(
  today: string,
  loggedDates: Set<string>,
  completedMenuDates: Set<string>,
): number {
  let streak = 0;
  let cursor = today;
  for (;;) {
    if (!loggedDates.has(cursor) && !completedMenuDates.has(cursor)) break;
    streak++;
    cursor = addCalendarDaysISO(cursor, -1);
  }
  return streak;
}

function logSummaryForMeal(
  foodRows: { meal_type: string; food_log_items: { name: string }[] | null }[],
  key: string,
): string {
  const names = foodRows
    .filter((r) => r.meal_type === key)
    .flatMap((r) => (r.food_log_items ?? []).map((i) => i.name));
  if (!names.length) return '尚未紀錄';
  const u = Array.from(new Set(names));
  return u.slice(0, 4).join('、') + (u.length > 4 ? '…' : '');
}

function logCheckedForMeal(
  foodRows: { meal_type: string; food_log_items: unknown[] | null }[],
  key: string,
): boolean {
  return foodRows.some(
    (r) => r.meal_type === key && (r.food_log_items?.length ?? 0) > 0,
  );
}

function buildMealRows(
  menuRow: {
    meals: {
      type: string;
      is_checked_in: boolean | null;
      meal_items: { name: string }[] | null;
    }[];
  } | null,
  foodRows: {
    meal_type: string;
    food_log_items: { name: string }[] | null;
  }[],
): DashboardHomeProps['meals'] {
  const byType = new Map<
    string,
    { checked: boolean; names: string[] }
  >();

  if (menuRow?.meals?.length) {
    for (const m of menuRow.meals) {
      const names = (m.meal_items ?? []).map((i) => i.name);
      byType.set(m.type, {
        checked: Boolean(m.is_checked_in),
        names,
      });
    }
  }

  return MEAL_ORDER.map((key) => {
    const fromPlan = byType.get(key);
    const checked =
      Boolean(fromPlan?.checked) || logCheckedForMeal(foodRows, key);

    let summary = '';
    if (fromPlan?.names?.length) {
      const u = Array.from(new Set(fromPlan.names));
      summary = u.slice(0, 4).join('、') + (u.length > 4 ? '…' : '');
    }
    if (!summary) summary = logSummaryForMeal(foodRows, key);

    return {
      key,
      label: MEAL_LABEL[key],
      checked,
      summary,
    };
  });
}
