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
      log_type,
      from_plan_meal_id,
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
      id: string;
      type: string;
      is_checked_in: boolean | null;
      checkin_type: string | null;
      total_calories: number | null;
      meal_items: { name: string }[] | null;
    }[];
  } | null = null;

  if (plan?.id) {
    const { data } = await supabase
      .from('daily_menus')
      .select(
        `
      meals (
        id,
        type,
        is_checked_in,
        checkin_type,
        total_calories,
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

function formatPlanPreview(names: string[]): string {
  const u = Array.from(new Set(names.filter(Boolean)));
  if (!u.length) return '—';
  return u.slice(0, 3).join(' · ') + (u.length > 3 ? '…' : '');
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

/** 有熱量紀錄即視為「已記錄」（含項目為空之異常列） */
function logsHaveEnergy(
  logs: {
    food_log_items: { calories: number | string }[] | null;
  }[],
): boolean {
  return sumMealKcal(logs) > 0;
}

function buildMealRows(
  menuRow: {
    meals: {
      id: string;
      type: string;
      is_checked_in: boolean | null;
      checkin_type: string | null;
      meal_items: { name: string }[] | null;
    }[];
  } | null,
  foodRows: {
    meal_type: string;
    log_type: string;
    food_log_items: { name: string; calories: number }[] | null;
  }[],
): DashboardHomeProps['meals'] {
  const plannedByType = new Map<
    string,
    { meal_items: { name: string }[] | null }
  >();

  if (menuRow?.meals?.length) {
    for (const m of menuRow.meals) {
      plannedByType.set(m.type, { meal_items: m.meal_items ?? [] });
    }
  }

  const rows: DashboardHomeProps['meals'] = [];

  for (const key of MEAL_ORDER) {
    const planned = plannedByType.get(key);
    const hasPlan = Boolean(planned);
    const logsForType = foodRows.filter((r) => r.meal_type === key);
    const totalKcal = sumMealKcal(logsForType);
    const hasLog = logsHaveEnergy(logsForType);

    if (!hasPlan && !hasLog) continue;

    const recordHref = `/log?meal_type=${encodeURIComponent(key)}`;

    if (!hasPlan && hasLog) {
      rows.push({
        key,
        label: MEAL_LABEL[key],
        variant: 'self_logged',
        detailLine: '自行記錄',
        kcal: totalKcal,
        recordHref,
      });
      continue;
    }

    if (hasPlan && !hasLog) {
      const names = (planned?.meal_items ?? []).map((i) => i.name);
      rows.push({
        key,
        label: MEAL_LABEL[key],
        variant: 'planned_pending',
        detailLine: `計畫：${formatPlanPreview(names)}`,
        kcal: null,
        recordHref,
      });
      continue;
    }

    // hasPlan && hasLog
    const onlyFromPlan =
      logsForType.length === 1 && logsForType[0].log_type === 'from_plan';
    const variant: 'as_planned' | 'adjusted' =
      onlyFromPlan ? 'as_planned' : 'adjusted';

    rows.push({
      key,
      label: MEAL_LABEL[key],
      variant,
      detailLine:
        variant === 'as_planned' ? '已記錄（照計畫）' : '已記錄（有調整）',
      kcal: totalKcal,
      recordHref,
    });
  }

  return rows;
}
