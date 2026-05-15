import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildDashboardDietContextBrief,
  buildDashboardHealthGoalsBrief,
  buildSevenDayRollingBrief,
  hasRollingLogDataInWeek,
} from '@/lib/ai/dashboard-insight-window-brief';
import { callClaudeJSON } from '@/lib/ai/claude';
import { buildDashboardInsightWindowPrompt } from '@/lib/ai/prompts/dashboard-insight';
import { insertAiUsageEvent } from '@/lib/ai/record-ai-usage';
import type { ClaudeTokenUsage } from '@/lib/ai/token-usage-to-ai-quota';
import {
  taipeiInsightWindowContext,
} from '@/lib/datetime/dashboard-insight-period-taipei';
import {
  aggregateActivityLogsByDate,
  aggregateFoodLogsByDate,
  aggregateVitalLogsByDate,
} from '@/lib/log';
import { addCalendarDaysISO } from '@/lib/onboarding/date';
import { personalContextFacetsHasContent } from '@/lib/personal-context/normalize-facets';
import { parsePersonalContextFacetsFromDb } from '@/lib/personal-context/parse-from-db';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/types/supabase';

type InsightShape = {
  bullets?: unknown;
};

export const MAX_INSIGHT_BULLETS = 4;
export const MAX_INSIGHT_BULLET_CHARS = 80;

export const DASHBOARD_INSIGHT_FALLBACK_BULLETS = [
  '可先從紀錄一兩天的飲食與運動開始，並在設定中補上飲食習慣，之後就能取得更個人化的建議。',
];

function clampInsightBullets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (!t) continue;
    out.push(t.slice(0, MAX_INSIGHT_BULLET_CHARS));
    if (out.length >= MAX_INSIGHT_BULLETS) break;
  }
  return out;
}

function bulletsFromCachedJson(raw: Json): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (!t) continue;
    out.push(t);
    if (out.length >= MAX_INSIGHT_BULLETS) break;
  }
  return out.length > 0 ? out : null;
}

const PROFILE_SELECT =
  'diet_method, diet_type, allergens, avoid_foods, meal_frequency, activity_level, tracks_glycemic_concern, personal_context_facets, height_cm, weight_kg, bmi, bmr, tdee';
const GOAL_SELECT =
  'type, target_weight_kg, weekly_rate_kg, daily_cal_target, target_date';

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  if (err.code === '23505') return true;
  const m = err.message ?? '';
  return m.includes('duplicate key') || m.includes('unique constraint');
}

type FreshResult =
  | {
      ok: true;
      bullets: string[];
      recordUsage: boolean;
      usage: ClaudeTokenUsage | null;
    }
  | { ok: false; error: string; status: number };

async function computeFreshDashboardInsight(
  supabase: SupabaseClient<Database>,
  userId: string,
  dataAsOfDate: string,
): Promise<FreshResult> {
  const weekStart = addCalendarDaysISO(dataAsOfDate, -6);

  const [
    { data: foodRows, error: foodErr },
    { data: activityRows, error: activityErr },
    { data: vitalRows, error: vitalErr },
    { data: goal, error: goalErr },
    { data: profile, error: profileErr },
  ] = await Promise.all([
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
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', dataAsOfDate),
    supabase
      .from('activity_logs')
      .select('logged_date, activity_type, duration_minutes, calories_est')
      .eq('user_id', userId)
      .gte('logged_date', weekStart)
      .lte('logged_date', dataAsOfDate),
    supabase
      .from('vital_logs')
      .select('date, water_ml, sleep_hours, weight_kg')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', dataAsOfDate)
      .order('date', { ascending: true }),
    supabase
      .from('user_goals')
      .select(GOAL_SELECT)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select(PROFILE_SELECT)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const firstQueryError =
    foodErr ?? activityErr ?? vitalErr ?? goalErr ?? profileErr;
  if (firstQueryError) {
    console.error('dashboard-insight query:', firstQueryError);
    return { ok: false, error: '無法載入紀錄', status: 500 };
  }

  if (!profile) {
    return { ok: false, error: '無法讀取個人檔案', status: 500 };
  }

  const nutritionByDate = aggregateFoodLogsByDate(foodRows ?? []);
  const { activityByDate, activityEvents } = aggregateActivityLogsByDate(
    activityRows ?? [],
  );
  const vitalByDate = aggregateVitalLogsByDate(vitalRows ?? []);

  const dailyCalTargetRaw = goal?.daily_cal_target;
  const dailyCalTarget =
    dailyCalTargetRaw != null && Number.isFinite(Number(dailyCalTargetRaw)) ?
      Number(dailyCalTargetRaw)
    : null;

  const facets = parsePersonalContextFacetsFromDb(profile.personal_context_facets);

  const dietContextBrief = buildDashboardDietContextBrief({
    diet_method: profile.diet_method,
    diet_type: profile.diet_type,
    allergens: profile.allergens,
    avoid_foods: profile.avoid_foods,
    meal_frequency: profile.meal_frequency,
    activity_level: profile.activity_level,
    tracks_glycemic_concern: profile.tracks_glycemic_concern,
    facets,
  });

  const healthGoalsBrief = buildDashboardHealthGoalsBrief({
    body: {
      height_cm: Number(profile.height_cm),
      weight_kg: Number(profile.weight_kg),
      bmi: profile.bmi != null ? Number(profile.bmi) : null,
      bmr: profile.bmr != null ? Number(profile.bmr) : null,
      tdee: profile.tdee != null ? Number(profile.tdee) : null,
    },
    goal:
      goal != null ?
        {
          type: goal.type,
          target_weight_kg: Number(goal.target_weight_kg),
          weekly_rate_kg: Number(goal.weekly_rate_kg),
          daily_cal_target: Number(goal.daily_cal_target),
          target_date: goal.target_date,
        }
      : null,
  });

  const activityEventsInWindow = activityEvents.filter(
    (e) => e.logged_date >= weekStart && e.logged_date <= dataAsOfDate,
  );

  const rollingBrief = buildSevenDayRollingBrief({
    weekStart,
    today: dataAsOfDate,
    dailyCalTarget,
    nutritionByDate,
    activityByDate,
    vitalByDate,
    activityEventsInWindow,
  });

  const hasRolling = hasRollingLogDataInWeek({
    weekStart,
    today: dataAsOfDate,
    nutritionByDate,
    activityByDate,
    vitalByDate,
  });

  const h = Number(profile.height_cm);
  const w = Number(profile.weight_kg);
  const hasValidBodyMetrics =
    Number.isFinite(h) && h > 0 && Number.isFinite(w) && w > 0;
  const hasActiveGoal = goal != null;

  const hasProfileExtras =
    personalContextFacetsHasContent(facets) ||
    (profile.allergens?.length ?? 0) > 0 ||
    (profile.avoid_foods?.length ?? 0) > 0 ||
    profile.diet_method != null ||
    profile.tracks_glycemic_concern === true ||
    hasActiveGoal ||
    hasValidBodyMetrics;

  if (!hasRolling && !hasProfileExtras) {
    return {
      ok: true,
      bullets: [...DASHBOARD_INSIGHT_FALLBACK_BULLETS],
      recordUsage: false,
      usage: null,
    };
  }

  const prompt = buildDashboardInsightWindowPrompt({
    dietContextBrief,
    healthGoalsBrief,
    rollingLogBrief: rollingBrief,
  });

  let usage: ClaudeTokenUsage | null = null;
  let parsed: InsightShape;
  try {
    const out = await callClaudeJSON<InsightShape>(prompt);
    parsed = out.data;
    usage = out.usage;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '解析失敗';
    return { ok: false, error: msg, status: 500 };
  }

  const clamped = clampInsightBullets(parsed.bullets);
  const bullets =
    clamped.length > 0 ? clamped : [...DASHBOARD_INSIGHT_FALLBACK_BULLETS];

  return { ok: true, bullets, recordUsage: true, usage };
}

async function selectCachedBullets(
  supabase: SupabaseClient<Database>,
  userId: string,
  insightDate: string,
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('dashboard_daily_insights')
    .select('bullets')
    .eq('user_id', userId)
    .eq('insight_date', insightDate)
    .maybeSingle();

  if (error) {
    console.error('dashboard_daily_insights read:', error);
    return null;
  }
  if (!data) return null;
  return bulletsFromCachedJson(data.bullets);
}

async function insertInsightCacheRow(
  supabase: SupabaseClient<Database>,
  userId: string,
  insightDate: string,
  bullets: string[],
): Promise<void> {
  const payload = bullets as unknown as Json;
  const { error } = await supabase.from('dashboard_daily_insights').insert({
    user_id: userId,
    insight_date: insightDate,
    bullets: payload,
  });

  if (!error) return;

  if (isUniqueViolation(error)) {
    return;
  }

  console.error('dashboard_daily_insights insert:', error);
}

/**
 * 以 Asia/Taipei 每日 04:00 為界的「建議週期日」為 `insight_date` 快取鍵；有快取即回傳，否則產出（每週期每使用者最多呼叫 Claude 一次並寫入快取）。
 * 近 7 日彙總仍以 Taipei 曆法「今日」為結束日（與是否已過 04:00 無關）。
 */
export async function getOrCreateDashboardDailyInsight(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ bullets: string[]; status: number; error?: string }> {
  const { periodDate, dataAsOfDate } = taipeiInsightWindowContext();

  const cached = await selectCachedBullets(supabase, userId, periodDate);
  if (cached != null) {
    return { bullets: cached, status: 200 };
  }

  const fresh = await computeFreshDashboardInsight(
    supabase,
    userId,
    dataAsOfDate,
  );
  if (!fresh.ok) {
    return { bullets: [], status: fresh.status, error: fresh.error };
  }

  await insertInsightCacheRow(supabase, userId, periodDate, fresh.bullets);

  if (fresh.recordUsage) {
    try {
      const admin = createServiceRoleClient();
      await insertAiUsageEvent(admin, {
        userId,
        source: 'dashboard_insight',
        usage: fresh.usage,
      });
    } catch (e) {
      console.error('dashboard-insight record AI usage:', e);
    }
  }

  const reread = await selectCachedBullets(supabase, userId, periodDate);

  return { bullets: reread ?? fresh.bullets, status: 200 };
}
