import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';
import {
  refreshDailyMenuCompletion,
} from '@/lib/plan/menu-completion';

async function fetchMealForCopy(
  supabase: SupabaseClient,
  mealId: string,
  userId: string,
): Promise<
  | {
      ok: true;
      meal: {
        id: string;
        type: string;
        menu_id: string;
        date: string;
        meal_items: Array<{
          name: string;
          quantity_g: number;
          calories: number;
          carb_g: number;
          protein_g: number;
          fat_g: number;
          fiber_g: number | null;
          sodium_mg: number | null;
        }>;
      };
    }
  | { ok: false; error: string }
> {
  const { data: meal, error } = await supabase
    .from('meals')
    .select(
      `
      id,
      type,
      menu_id,
      meal_items (
        name,
        quantity_g,
        calories,
        carb_g,
        protein_g,
        fat_g,
        fiber_g,
        sodium_mg
      ),
      daily_menus!inner (
        date,
        diet_plans!inner ( user_id )
      )
    `,
    )
    .eq('id', mealId)
    .single();

  if (error || !meal) {
    return { ok: false, error: error?.message ?? '找不到餐次' };
  }

  const dm = meal.daily_menus as unknown as {
    date: string;
    diet_plans: { user_id: string };
  };

  if (dm.diet_plans.user_id !== userId) {
    return { ok: false, error: '無權限' };
  }

  const items = (meal.meal_items ?? []).map((it) => ({
    name: it.name,
    quantity_g: Number(it.quantity_g),
    calories: Number(it.calories),
    carb_g: Number(it.carb_g),
    protein_g: Number(it.protein_g),
    fat_g: Number(it.fat_g),
    fiber_g:
      it.fiber_g === null || it.fiber_g === undefined
        ? null
        : Number(it.fiber_g),
    sodium_mg:
      it.sodium_mg === null || it.sodium_mg === undefined
        ? null
        : Number(it.sodium_mg),
  }));

  return {
    ok: true,
    meal: {
      id: meal.id,
      type: meal.type,
      menu_id: meal.menu_id,
      date: dm.date,
      meal_items: items,
    },
  };
}

/**
 * 將計畫餐複製為當日 food_logs，並將該餐標記為照吃（exact）。
 * 使用瀏覽器 Supabase client（Client Component）。
 */
export async function copyMealToLog(
  mealId: string,
  userId: string,
  date: string,
): Promise<{ error?: string; logId?: string }> {
  const supabase = createClient();

  const parsed = await fetchMealForCopy(supabase, mealId, userId);
  if (!parsed.ok) return { error: parsed.error };

  const { meal } = parsed;

  if (meal.date !== date) {
    return { error: '日期與該餐菜單不符' };
  }

  const { data: existing } = await supabase
    .from('food_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('from_plan_meal_id', mealId)
    .maybeSingle();

  if (existing?.id) {
    return { error: '此餐已建立過飲食紀錄' };
  }

  const { data: logRow, error: logErr } = await supabase
    .from('food_logs')
    .insert({
      user_id: userId,
      date,
      meal_type: meal.type,
      method: 'from_plan',
      log_type: 'from_plan',
      from_plan_meal_id: mealId,
    })
    .select('id')
    .single();

  if (logErr || !logRow) {
    return { error: logErr?.message ?? '無法建立紀錄' };
  }

  const rows = meal.meal_items.map((it) => ({
    log_id: logRow.id,
    name: it.name,
    quantity_g: it.quantity_g,
    calories: it.calories,
    carb_g: it.carb_g,
    protein_g: it.protein_g,
    fat_g: it.fat_g,
    fiber_g: it.fiber_g,
    sodium_mg: it.sodium_mg,
    brand: null as string | null,
    is_verified: null as boolean | null,
  }));

  if (rows.length) {
    const { error: itemErr } = await supabase.from('food_log_items').insert(rows);
    if (itemErr) {
      await supabase.from('food_logs').delete().eq('id', logRow.id);
      return { error: itemErr.message };
    }
  }

  const { error: mealErr } = await supabase
    .from('meals')
    .update({
      is_checked_in: true,
      checkin_type: 'exact',
      checked_in_at: new Date().toISOString(),
    })
    .eq('id', mealId);

  if (mealErr) {
    await supabase.from('food_logs').delete().eq('id', logRow.id);
    return { error: mealErr.message };
  }

  const refresh = await refreshDailyMenuCompletion(supabase, meal.menu_id);
  if (refresh.error) return { error: refresh.error };

  return { logId: logRow.id };
}

/** 標記為「照吃但調整」：僅寫 checkin_type，不將 is_checked_in 設為 true。 */
export async function markMealModifiedPending(
  mealId: string,
  userId: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const parsed = await fetchMealForCopy(supabase, mealId, userId);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from('meals')
    .update({
      checkin_type: 'modified',
    })
    .eq('id', mealId);

  if (error) return { error: error.message };

  const refresh = await refreshDailyMenuCompletion(
    supabase,
    parsed.meal.menu_id,
  );
  if (refresh.error) return { error: refresh.error };

  return {};
}

/** 標記為跳過此餐：不建立 food_logs。 */
export async function markMealSkipped(
  mealId: string,
  userId: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const parsed = await fetchMealForCopy(supabase, mealId, userId);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from('meals')
    .update({
      is_checked_in: false,
      checkin_type: 'skipped',
      checked_in_at: null,
    })
    .eq('id', mealId);

  if (error) return { error: error.message };

  const refresh = await refreshDailyMenuCompletion(
    supabase,
    parsed.meal.menu_id,
  );
  if (refresh.error) return { error: refresh.error };

  return {};
}
