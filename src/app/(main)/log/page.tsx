import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import type { ActivityLogRow } from '@/app/(main)/log/activity-log-section';
import {
  LogClient,
  type FoodLogSnapshot,
  type LogItemSnapshot,
  type LogSectionTab,
} from '@/app/(main)/log/log-client';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { todayLocalISODate } from '@/lib/onboarding/date';
import { createClient } from '@/lib/supabase/server';

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
  if (raw === 'activity' || raw === 'food') return raw;
  return 'food';
}

export default async function LogPage({
  searchParams,
}: {
  searchParams?: {
    date?: string;
    meal_type?: string;
    tab?: string;
  };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const rawDate = searchParams?.date;
  const dateParam =
    typeof rawDate === 'string' && isoDateOk(rawDate) ? rawDate : undefined;

  const initialMealTab = parseMealType(searchParams?.meal_type);
  const sectionTab = parseSectionTab(
    typeof searchParams?.tab === 'string' ? searchParams.tab : undefined,
  );

  let activeDate = dateParam ?? todayLocalISODate();

  const { data: goal } = await supabase
    .from('user_goals')
    .select('daily_cal_target')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  const { data: rows } = await supabase
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
    .order('logged_at', { ascending: false });

  const initialLogs: FoodLogSnapshot[] = (rows ?? []).map((row) => ({
    id: row.id,
    meal_type: row.meal_type,
    method: row.method,
    logged_at: row.logged_at,
    food_log_items: normalizeItems(row.food_log_items),
  }));

  const { data: activityRows } = await supabase
    .from('activity_logs')
    .select(
      'id, logged_date, activity_type, duration_minutes, calories_est, notes',
    )
    .eq('user_id', user.id)
    .eq('logged_date', activeDate)
    .order('created_at', { ascending: false });

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

  return (
    <div className="space-y-3">
      <PageHeader
        title="每日紀錄"
        description="飲食與運動紀錄。"
        spacing="compact"
      />

      <Suspense
        fallback={
          <SectionCard className="p-6 text-[13px] text-muted-foreground">
            載入中…
          </SectionCard>
        }
      >
        <LogClient
          date={activeDate}
          dailyCalTarget={goal?.daily_cal_target ?? null}
          initialLogs={initialLogs}
          initialMealTab={initialMealTab}
          sectionTab={sectionTab}
          initialActivities={initialActivities}
        />
      </Suspense>
    </div>
  );
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
