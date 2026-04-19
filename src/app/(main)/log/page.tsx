import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  LogClient,
  type FoodLogSnapshot,
  type LogItemSnapshot,
} from '@/app/(main)/log/log-client';
import { todayLocalISODate } from '@/lib/onboarding/date';
import { createClient } from '@/lib/supabase/server';

export default async function LogPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const date = todayLocalISODate();

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
    .eq('date', date)
    .order('logged_at', { ascending: false });

  const initialLogs: FoodLogSnapshot[] = (rows ?? []).map((row) => ({
    id: row.id,
    meal_type: row.meal_type,
    method: row.method,
    logged_at: row.logged_at,
    food_log_items: normalizeItems(row.food_log_items),
  }));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-foreground">飲食紀錄</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            記錄今日用餐，對照熱量目標。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-[13px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          總覽
        </Link>
      </header>

      <LogClient
        date={date}
        dailyCalTarget={goal?.daily_cal_target ?? null}
        initialLogs={initialLogs}
      />
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
