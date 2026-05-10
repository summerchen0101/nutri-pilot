import { redirect } from 'next/navigation';

import type { ActivityLogRow } from '@/app/(main)/log/activity-log-section';
import type { LogVitalSnapshot } from '@/app/(main)/log/_components/log-vitals-card';
import {
  LogClient,
  type FoodLogSnapshot,
  type LogItemSnapshot,
  type LogSectionTab,
} from '@/app/(main)/log/log-client';
import { getCachedAuthContext } from '@/lib/auth';
import { todayLocalISODate } from '@/lib/onboarding/date';
import { getCachedUserProfileCoreRow } from '@/lib/user-profile/cached-core-profile';

function isoDateOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseMealType(
  raw: string | undefined,
): 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined {
  if (
    raw === 'breakfast' ||
    raw === 'lunch' ||
    raw === 'dinner' ||
    raw === 'snack'
  ) {
    return raw;
  }
  return undefined;
}

function parseSectionTab(raw: string | undefined): LogSectionTab {
  if (raw === 'activity' || raw === 'food' || raw === 'body') return raw;
  return 'food';
}

function normalizeItems(
  raw:
    | {
        id: string;
        name: string;
        quantity_g: number;
        calories: number;
        carb_g: number;
        protein_g: number;
        fat_g: number;
        fiber_g: number | null;
        sodium_mg: number | null;
        brand: string | null;
        is_verified: boolean | null;
      }[]
    | null,
): LogItemSnapshot[] | null {
  if (!raw?.length) return [];
  return raw.map((it) => ({
    id: it.id,
    name: it.name,
    quantity_g: Number(it.quantity_g),
    calories: Number(it.calories),
    carb_g: Number(it.carb_g),
    protein_g: Number(it.protein_g),
    fat_g: Number(it.fat_g),
    fiber_g: it.fiber_g == null ? null : Number(it.fiber_g),
    sodium_mg: it.sodium_mg == null ? null : Number(it.sodium_mg),
    brand: it.brand,
    is_verified: it.is_verified,
  }));
}

export async function LogPageContent({
  searchParams,
}: {
  searchParams?: {
    date?: string;
    meal_type?: string;
    tab?: string;
  };
}) {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const rawDate = searchParams?.date;
  const dateParam =
    typeof rawDate === 'string' && isoDateOk(rawDate) ? rawDate : undefined;

  const initialMealTab = parseMealType(searchParams?.meal_type);
  const sectionTab = parseSectionTab(
    typeof searchParams?.tab === 'string' ? searchParams.tab : undefined,
  );

  const activeDate = dateParam ?? todayLocalISODate();

  const todayIso = todayLocalISODate();
  const isLogToday = activeDate === todayIso;

  const [
    { data: goal },
    { data: rows },
    { data: activityRows },
    { data: vitalRow, error: vitalErr },
    { data: profile, error: profileErr },
    { data: priorWeightRow, error: priorWeightErr },
  ] = await Promise.all([
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
      id,
      meal_type,
      method,
      logged_at,
      food_log_items (
        id,
        name,
        quantity_g,
        calories,
        carb_g,
        protein_g,
        fat_g,
        fiber_g,
        sodium_mg,
        brand,
        is_verified
      )
    `,
      )
      .eq('user_id', user.id)
      .eq('date', activeDate)
      .order('logged_at', { ascending: false }),
    supabase
      .from('activity_logs')
      .select(
        'id, logged_date, activity_type, duration_minutes, calories_est, notes',
      )
      .eq('user_id', user.id)
      .eq('logged_date', activeDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('vital_logs')
      .select('weight_kg, water_ml, sleep_hours')
      .eq('user_id', user.id)
      .eq('date', activeDate)
      .maybeSingle(),
    getCachedUserProfileCoreRow(supabase, user.id),
    supabase
      .from('vital_logs')
      .select('weight_kg')
      .eq('user_id', user.id)
      .lt('date', activeDate)
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (vitalErr) {
    throw new Error(vitalErr.message);
  }
  if (profileErr) {
    throw new Error(profileErr.message);
  }
  if (priorWeightErr) {
    throw new Error(priorWeightErr.message);
  }

  const initialLogs: FoodLogSnapshot[] = (rows ?? []).map((row) => ({
    id: row.id,
    meal_type: row.meal_type,
    method: row.method,
    logged_at: row.logged_at,
    food_log_items: normalizeItems(row.food_log_items),
  }));

  const initialActivities: ActivityLogRow[] = (activityRows ?? []).map(
    (r) => ({
      id: r.id,
      logged_date: r.logged_date,
      activity_type: r.activity_type,
      duration_minutes: r.duration_minutes,
      calories_est:
        r.calories_est != null ? Number(r.calories_est) : null,
      notes: r.notes ?? null,
    }),
  );



  const loggedWeightKg =
    vitalRow?.weight_kg != null ? Number(vitalRow.weight_kg) : null;

  let weightPrefillKg: number | null = null;
  if (loggedWeightKg == null) {
    if (priorWeightRow?.weight_kg != null) {
      weightPrefillKg = Number(priorWeightRow.weight_kg);
    } else if (profile?.weight_kg != null) {
      const w = Number(profile.weight_kg);
      if (Number.isFinite(w)) {
        weightPrefillKg = w;
      }
    }
  }

  const initialVital: LogVitalSnapshot = {
    weightKg: loggedWeightKg,
    weightPrefillKg,
    waterMl:
      vitalRow?.water_ml != null
        ? Math.round(Number(vitalRow.water_ml))
        : 0,
    sleepHours:
      vitalRow?.sleep_hours != null
        ? Number(vitalRow.sleep_hours)
        : null,
  };

  return (
    <LogClient
      date={activeDate}
      dailyCalTarget={goal?.daily_cal_target ?? null}
      initialLogs={initialLogs}
      initialMealTab={initialMealTab}
      sectionTab={sectionTab}
      initialActivities={initialActivities}
      initialVital={initialVital}
      isLogToday={isLogToday}
    />
  );
}
