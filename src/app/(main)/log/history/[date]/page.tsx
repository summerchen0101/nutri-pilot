import { redirect } from 'next/navigation';

import { LogHistoryDayClient } from '@/app/(main)/log/history/log-history-day-client';
import type { ActivityLogRow } from '@/app/(main)/log/activity-log-section';
import type { LogVitalSnapshot } from '@/app/(main)/log/_components/log-vitals-card';
import type { FoodLogSnapshot } from '@/app/(main)/log/log-food-snapshot';
import { normalizeLogItems } from '@/app/(main)/log/log-normalize';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { getCachedAuthContext } from '@/lib/auth';
import { getLogDateMode, isoDateOk } from '@/lib/log/log-date-policy';
import { formatLogDateHeading } from '@/lib/log/log-date-label';
import { todayLocalISODate } from '@/lib/onboarding/date';
import { getCachedUserProfileCoreRow } from '@/lib/user-profile/cached-core-profile';

export default async function LogHistoryDayPage({
  params,
}: {
  params: { date: string };
}) {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const date = params.date;
  if (!isoDateOk(date)) redirect('/log/history');

  const today = todayLocalISODate();
  const mode = getLogDateMode(date, today);

  if (mode === 'today') redirect('/log');
  if (mode === 'yesterday_editable') {
    redirect(`/log?date=${encodeURIComponent(date)}`);
  }

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
      .eq('date', date)
      .order('logged_at', { ascending: false }),
    supabase
      .from('activity_logs')
      .select(
        'id, logged_date, activity_type, duration_minutes, calories_est, notes',
      )
      .eq('user_id', user.id)
      .eq('logged_date', date)
      .order('created_at', { ascending: false }),
    supabase
      .from('vital_logs')
      .select('weight_kg, water_ml, sleep_hours')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle(),
    getCachedUserProfileCoreRow(supabase, user.id),
    supabase
      .from('vital_logs')
      .select('weight_kg')
      .eq('user_id', user.id)
      .lt('date', date)
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (vitalErr) throw new Error(vitalErr.message);
  if (profileErr) throw new Error(profileErr.message);
  if (priorWeightErr) throw new Error(priorWeightErr.message);

  const logs: FoodLogSnapshot[] = (rows ?? []).map((row) => ({
    id: row.id,
    meal_type: row.meal_type,
    method: row.method,
    logged_at: row.logged_at,
    food_log_items: normalizeLogItems(row.food_log_items),
  }));

  const activities: ActivityLogRow[] = (activityRows ?? []).map((r) => ({
    id: r.id,
    logged_date: r.logged_date,
    activity_type: r.activity_type,
    duration_minutes: r.duration_minutes,
    calories_est: r.calories_est != null ? Number(r.calories_est) : null,
    notes: r.notes ?? null,
  }));

  const loggedWeightKg =
    vitalRow?.weight_kg != null ? Number(vitalRow.weight_kg) : null;

  let weightPrefillKg: number | null = null;
  if (loggedWeightKg == null) {
    if (priorWeightRow?.weight_kg != null) {
      weightPrefillKg = Number(priorWeightRow.weight_kg);
    } else if (profile?.weight_kg != null) {
      const w = Number(profile.weight_kg);
      if (Number.isFinite(w)) weightPrefillKg = w;
    }
  }

  const vital: LogVitalSnapshot = {
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

  const hasAnyData =
    logs.length > 0 ||
    activities.length > 0 ||
    vital.weightKg != null ||
    vital.waterMl > 0 ||
    vital.sleepHours != null;

  if (!hasAnyData) redirect('/log/history');

  return (
    <div className="space-y-3">
      <StickyPageHeader
        leading={<HeaderBackButton />}
        title={formatLogDateHeading(date, today)}
        spacing="compact"
      />
      <p className="text-caption text-muted-foreground">僅供查看，無法修改</p>
      <LogHistoryDayClient
        date={date}
        dailyCalTarget={goal?.daily_cal_target ?? null}
        logs={logs}
        activities={activities}
        vital={vital}
      />
    </div>
  );
}
