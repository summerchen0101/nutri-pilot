import { redirect } from 'next/navigation';

import {
  PlanView,
  type PlanMenuSnapshot,
} from '@/app/(main)/plan/plan-view';
import { todayLocalISODate } from '@/lib/onboarding/date';
import { sevenDayDatesInPlan } from '@/lib/plan/date-window';
import { createClient } from '@/lib/supabase/server';

function planSpanDays(start: string, end: string): number {
  const s = new Date(start + 'T12:00:00').getTime();
  const e = new Date(end + 'T12:00:00').getTime();
  return Math.floor((e - s) / 86400000) + 1;
}

function daysRemainingInclusive(endIso: string): number {
  const today = todayLocalISODate();
  if (today > endIso) return 0;
  const t = new Date(today + 'T12:00:00').getTime();
  const e = new Date(endIso + 'T12:00:00').getTime();
  return Math.floor((e - t) / 86400000) + 1;
}

export default async function PlanPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: plan } = await supabase
    .from('diet_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!plan) redirect('/onboarding');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('avoid_foods')
    .eq('user_id', user.id)
    .single();

  const { data: goal } = await supabase
    .from('user_goals')
    .select('daily_cal_target')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  const windowDates = sevenDayDatesInPlan(plan);

  const { data: menuRows } = await supabase
    .from('daily_menus')
    .select(
      `
      id,
      date,
      status,
      total_calories,
      completion_pct,
      is_completed,
      meals (
        id,
        type,
        scheduled_at,
        is_checked_in,
        checked_in_at,
        checkin_type,
        total_calories,
        meal_items (
          id,
          name,
          quantity_g,
          calories,
          carb_g,
          protein_g,
          fat_g,
          fiber_g,
          sodium_mg
        )
      )
    `,
    )
    .eq('plan_id', plan.id)
    .in('date', windowDates);

  const menus: PlanMenuSnapshot[] = (menuRows ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    status: row.status,
    total_calories: row.total_calories,
    completion_pct: row.completion_pct,
    is_completed: row.is_completed,
    meals: normalizeMeals(row.meals),
  }));

  const totalPlanDays = planSpanDays(plan.start_date, plan.end_date);

  const { count: completedDays } = await supabase
    .from('daily_menus')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', plan.id)
    .eq('is_completed', true);

  const remaining = daysRemainingInclusive(plan.end_date);

  const progressRate =
    totalPlanDays > 0
      ? Math.round(((completedDays ?? 0) / totalPlanDays) * 1000) / 10
      : 0;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-medium text-foreground">飲食計畫</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {plan.diet_method} · {plan.duration_days} 天計畫
        </p>
      </header>
      <PlanView
        plan={plan}
        windowDates={windowDates}
        initialMenus={menus}
        dailyCalTarget={goal?.daily_cal_target ?? null}
        avoidFoods={profile?.avoid_foods ?? []}
        progress={{
          totalPlanDays,
          completedDays: completedDays ?? 0,
          remainingDays: Math.max(0, remaining),
          ratePct: progressRate,
        }}
      />
    </div>
  );
}

function normalizeMeals(
  meals:
    | {
        id: string;
        type: string;
        scheduled_at: string | null;
        is_checked_in: boolean | null;
        checked_in_at: string | null;
        checkin_type: string | null;
        total_calories: number | null;
        meal_items:
          | {
              id: string;
              name: string;
              quantity_g: number;
              calories: number;
              carb_g: number;
              protein_g: number;
              fat_g: number;
              fiber_g?: number | null;
              sodium_mg?: number | null;
            }[]
          | null;
      }[]
    | null,
): PlanMenuSnapshot['meals'] {
  if (!meals?.length) return [];
  const order: Record<string, number> = {
    breakfast: 0,
    lunch: 1,
    dinner: 2,
    snack: 3,
  };
  return [...meals]
    .sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9))
    .map((m) => ({
      id: m.id,
      type: m.type,
      scheduled_at: m.scheduled_at,
      is_checked_in: m.is_checked_in,
      checked_in_at: m.checked_in_at,
      checkin_type: m.checkin_type ?? null,
      total_calories: m.total_calories,
      meal_items: m.meal_items ?? [],
    }));
}
