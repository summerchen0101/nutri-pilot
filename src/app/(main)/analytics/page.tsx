import { redirect } from 'next/navigation';

import {
  AnalyticsView,
  type WeeklyInsightPayload,
} from '@/app/(main)/analytics/analytics-view';
import {
  addCalendarDaysISO,
  iterateISODatesInclusive,
  todayLocalISODate,
} from '@/lib/onboarding/date';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';

export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const today = todayLocalISODate();

  const [{ data: profile }, { data: goal }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('user_goals')
      .select('daily_cal_target')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (!profile) redirect('/onboarding');

  const rangeStart = profile.updated_at?.slice(0, 10) ?? today;
  const rangeEnd = today;

  const [{ data: vitals }, { data: foodRows }, { data: activityRows }, insightResult] =
    await Promise.all([
      supabase
        .from('vital_logs')
        .select('date, weight_kg')
        .eq('user_id', user.id)
        .gte('date', rangeStart)
        .lte('date', rangeEnd)
        .order('date', { ascending: true }),
      supabase
        .from('food_logs')
        .select(
          `
      date,
      food_log_items (
        calories,
        carb_g,
        protein_g,
        fat_g
      )
    `,
        )
        .eq('user_id', user.id)
        .gte('date', rangeStart)
        .lte('date', rangeEnd),
      supabase
        .from('activity_logs')
        .select('logged_date, activity_type, duration_minutes, calories_est')
        .eq('user_id', user.id)
        .gte('logged_date', rangeStart)
        .lte('logged_date', rangeEnd),
      supabase
        .from('weekly_insights')
        .select('insights, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const insightRow =
    insightResult.error ? null : insightResult.data;

  const nutritionByDate = aggregateFoodRows(foodRows ?? []);
  const { activityByDate, activityEvents } = aggregateActivityRows(
    activityRows ?? [],
  );

  const weightByDate: Record<string, number> = {};
  for (const v of vitals ?? []) {
    if (v.date && v.weight_kg != null) {
      weightByDate[v.date] = Number(v.weight_kg);
    }
  }

  const dailyCalTarget =
    goal?.daily_cal_target != null ? Number(goal.daily_cal_target) : null;

  let weeklyInsight: WeeklyInsightPayload | null = null;
  if (insightRow && insightRow.created_at != null) {
    weeklyInsight = {
      createdAt: insightRow.created_at,
      items: parseInsightsJson(insightRow.insights),
    };
  }

  const weekStartRolling = addCalendarDaysISO(today, -6);
  const rollingWeekDates = iterateISODatesInclusive(
    weekStartRolling,
    today,
  );
  let kcalSumRolling = 0;
  let kcalDaysRolling = 0;
  for (const d of rollingWeekDates) {
    const n = nutritionByDate[d];
    if (n && n.kcal > 0) {
      kcalSumRolling += n.kcal;
      kcalDaysRolling++;
    }
  }
  const weekAvgKcal =
    kcalDaysRolling > 0 ? Math.round(kcalSumRolling / kcalDaysRolling) : 0;

  const weekVitals = (vitals ?? [])
    .filter(
      (v) =>
        v.date >= weekStartRolling &&
        v.date <= today &&
        v.weight_kg != null,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  let weightSummaryLine: string;
  if (weekVitals.length >= 2) {
    const w0 = Number(weekVitals[0].weight_kg);
    const w1 = Number(weekVitals[weekVitals.length - 1].weight_kg);
    const diff = w1 - w0;
    const sign = diff > 0 ? '+' : '';
    weightSummaryLine = `本週變化 ${sign}${diff.toFixed(1)} kg`;
  } else if (weekVitals.length === 1) {
    weightSummaryLine = `最近 ${Number(weekVitals[0].weight_kg).toFixed(1)} kg`;
  } else {
    weightSummaryLine = '本週尚無體重紀錄';
  }

  const rangeLabel = `${weekStartRolling.slice(5)} ~ ${today.slice(5)}`;

  const weekActivityRows = (activityRows ?? []).filter(
    (r) =>
      r.logged_date >= weekStartRolling &&
      r.logged_date <= today,
  );
  let weekActivityMinutes = 0;
  let weekActivityKcalEst = 0;
  let weekActivityHadEst = false;
  for (const r of weekActivityRows) {
    weekActivityMinutes += Number(r.duration_minutes) || 0;
    if (
      r.calories_est != null &&
      Number.isFinite(Number(r.calories_est))
    ) {
      weekActivityHadEst = true;
      weekActivityKcalEst += Number(r.calories_est);
    }
  }

  let activityMinutesLine: string;
  let activityKcalLine: string;
  if (weekActivityMinutes <= 0) {
    activityMinutesLine = '本週尚無運動紀錄';
    activityKcalLine = '—';
  } else {
    activityMinutesLine = `本週合計 ${weekActivityMinutes} 分鐘`;
    activityKcalLine = weekActivityHadEst
      ? `估消耗約 ${Math.round(weekActivityKcalEst)} kcal`
      : '尚無估熱紀錄';
  }

  return (
    <AnalyticsView
      todayIso={today}
      planStartIso={rangeStart}
      nutritionByDate={nutritionByDate}
      weightByDate={weightByDate}
      activityByDate={activityByDate}
      activityEvents={activityEvents}
      dailyCalTarget={dailyCalTarget}
      macroPct={{
        carb: 45,
        protein: 30,
        fat: 25,
      }}
      weeklyInsight={weeklyInsight}
      weekShareSummary={{
        rangeLabel,
        avgKcal: weekAvgKcal,
        weightSummaryLine,
        activityMinutesLine,
        activityKcalLine,
      }}
    />
  );
}

function aggregateFoodRows(
  rows: {
    date: string;
    food_log_items:
      | {
          calories: number;
          carb_g: number;
          protein_g: number;
          fat_g: number;
        }[]
      | null;
  }[],
): Record<
  string,
  { kcal: number; carbG: number; proteinG: number; fatG: number }
> {
  const map: Record<
    string,
    { kcal: number; carbG: number; proteinG: number; fatG: number }
  > = {};

  for (const row of rows) {
    const d = row.date;
    if (!map[d]) {
      map[d] = { kcal: 0, carbG: 0, proteinG: 0, fatG: 0 };
    }
    for (const it of row.food_log_items ?? []) {
      map[d].kcal += Number(it.calories) || 0;
      map[d].carbG += Number(it.carb_g) || 0;
      map[d].proteinG += Number(it.protein_g) || 0;
      map[d].fatG += Number(it.fat_g) || 0;
    }
  }

  return map;
}

function aggregateActivityRows(
  rows: {
    logged_date: string;
    activity_type: string;
    duration_minutes: number;
    calories_est: number | null;
  }[],
): {
  activityByDate: Record<string, { minutes: number; kcalEst: number }>;
  activityEvents: {
    logged_date: string;
    activity_type: string;
    duration_minutes: number;
  }[];
} {
  const activityByDate: Record<string, { minutes: number; kcalEst: number }> =
    {};
  const activityEvents: {
    logged_date: string;
    activity_type: string;
    duration_minutes: number;
  }[] = [];

  for (const row of rows) {
    const d = row.logged_date;
    if (!activityByDate[d]) {
      activityByDate[d] = { minutes: 0, kcalEst: 0 };
    }
    const min = Number(row.duration_minutes) || 0;
    activityByDate[d].minutes += min;
    if (
      row.calories_est != null &&
      Number.isFinite(Number(row.calories_est))
    ) {
      activityByDate[d].kcalEst += Number(row.calories_est);
    }
    activityEvents.push({
      logged_date: d,
      activity_type: row.activity_type,
      duration_minutes: min,
    });
  }

  return { activityByDate, activityEvents };
}

function parseInsightsJson(raw: Json): WeeklyInsightPayload['items'] {
  if (!Array.isArray(raw)) return [];
  const out: WeeklyInsightPayload['items'] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const text = typeof o.text === 'string' ? o.text : '';
    const type =
      o.type === 'positive' || o.type === 'warning' || o.type === 'info'
        ? o.type
        : 'info';
    if (text.trim()) out.push({ type, text });
  }
  return out;
}
