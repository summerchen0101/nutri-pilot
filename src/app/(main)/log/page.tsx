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
        brand
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">飲食紀錄</h1>
          <p className="mt-1 text-sm text-slate-500">
            記錄今日用餐，對照熱量目標。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
        >
          Dashboard
        </Link>
      </div>

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
        brand: string | null;
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
    brand: it.brand,
  }));
}
