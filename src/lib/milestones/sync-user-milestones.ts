import type { SupabaseClient } from '@supabase/supabase-js';

import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';

/** 對應 UI 文案（繁中） */
export const MILESTONE_LABELS: Record<string, string> = {
  first_meal: '首次紀錄飲食',
  first_activity: '首次紀錄運動',
  first_weight: '首次紀錄體重',
  streak_7: '連續 7 天熱量達標',
  week_logs_5: '本週至少 5 天有紀錄',
};

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

/**
 * 依規則檢查並寫入新解鎖之 milestone（冪等：已存在不重複插入）。
 */
export async function syncUserMilestones(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const today = todayLocalISODate();
  const weekStart = addCalendarDaysISO(today, -6);
  const streakWindowStart = addCalendarDaysISO(today, -120);

  const eligible = new Set<string>();

  const [
    mealCountRes,
    activityCountRes,
    vitalRes,
    streakFoodRes,
    weekFoodRes,
    goalRes,
  ] = await Promise.all([
    supabase
      .from('food_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('vital_logs')
      .select('id')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .limit(1),
    supabase
      .from('food_logs')
      .select('date, food_log_items(calories)')
      .eq('user_id', userId)
      .gte('date', streakWindowStart)
      .lte('date', today),
    supabase
      .from('food_logs')
      .select('date, food_log_items(calories)')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', today),
    supabase
      .from('user_goals')
      .select('daily_cal_target')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if ((mealCountRes.count ?? 0) > 0) eligible.add('first_meal');
  if ((activityCountRes.count ?? 0) > 0) eligible.add('first_activity');
  if ((vitalRes.data?.length ?? 0) > 0) eligible.add('first_weight');

  const kcalByDate = aggregateKcalByDate(streakFoodRes.data ?? []);
  const targetKcal =
    goalRes.data?.daily_cal_target != null
      ? Number(goalRes.data.daily_cal_target)
      : null;
  if (targetKcal != null && targetKcal > 0) {
    const streak = computeGoalMetStreak(today, targetKcal, kcalByDate);
    if (streak >= 7) eligible.add('streak_7');
  }

  const weekMap = aggregateKcalByDate(weekFoodRes.data ?? []);
  let distinctDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = addCalendarDaysISO(weekStart, i);
    if (d > today) break;
    if ((weekMap.get(d) ?? 0) > 0) distinctDays++;
  }
  if (distinctDays >= 5) eligible.add('week_logs_5');

  const { data: existing } = await supabase
    .from('user_milestones')
    .select('milestone_key')
    .eq('user_id', userId);

  const have = new Set((existing ?? []).map((r) => r.milestone_key));
  const toInsert = Array.from(eligible)
    .filter((k) => !have.has(k))
    .map((milestone_key) => ({ user_id: userId, milestone_key }));

  if (toInsert.length > 0) {
    await supabase.from('user_milestones').insert(toInsert);
  }
}
