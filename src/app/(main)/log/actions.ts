'use server';

import { revalidatePath } from 'next/cache';

import { searchFoods } from '@/lib/food/search';
import { refreshDailyMenuCompletion } from '@/lib/plan/menu-completion';
import { createClient } from '@/lib/supabase/server';

export async function searchFoodsAction(query: string) {
  const supabase = createClient();
  try {
    return await searchFoods(supabase, query);
  } catch (e) {
    return {
      results: [],
      source: 'cache' as const,
      error: e instanceof Error ? e.message : '搜尋失敗',
    };
  }
}

export async function addFoodFromSearchAction(input: {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: string;
  quantityG: number;
  confirmedAiEstimate?: boolean;
  isVerified: boolean;
  macros: {
    calories: number;
    carb_g: number;
    protein_g: number;
    fat_g: number;
  };
  fiber_g: number | null;
  sodium_mg: number | null;
  hit: {
    name: string;
    brand: string | null;
    calories_per_100g: number;
    carb_g_per_100g: number;
    protein_g_per_100g: number;
    fat_g_per_100g: number;
    source?: string;
  };
}): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  if (
    input.hit.source === 'ai_estimate' &&
    input.confirmedAiEstimate !== true
  ) {
    return { error: '請先確認 AI 估算結果後再加入紀錄' };
  }

  if (
    !Number.isFinite(input.quantityG) ||
    input.quantityG <= 0
  ) {
    return { error: '請輸入有效份量' };
  }

  const { data: log, error: logErr } = await supabase
    .from('food_logs')
    .insert({
      user_id: user.id,
      date: input.date,
      meal_type: input.mealType,
      method: 'search',
    })
    .select('id')
    .single();

  if (logErr || !log) return { error: logErr?.message ?? '無法建立紀錄' };

  const { error: itemErr } = await supabase.from('food_log_items').insert({
    log_id: log.id,
    name: input.hit.name,
    quantity_g: input.quantityG,
    calories: input.macros.calories,
    carb_g: input.macros.carb_g,
    protein_g: input.macros.protein_g,
    fat_g: input.macros.fat_g,
    fiber_g: input.fiber_g,
    sodium_mg: input.sodium_mg,
    brand: input.hit.brand,
    is_verified: input.isVerified,
  });

  if (itemErr) return { error: itemErr.message };

  revalidatePath('/log');
  return {};
}

export async function deleteFoodLogAction(logId: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data: row } = await supabase
    .from('food_logs')
    .select('user_id')
    .eq('id', logId)
    .maybeSingle();

  if (!row || row.user_id !== user.id) return { error: '無權限' };

  const { error } = await supabase.from('food_logs').delete().eq('id', logId);
  if (error) return { error: error.message };

  revalidatePath('/log');
  return {};
}

/** 拍照辨識完成後：一筆 food_logs + 多個 food_log_items（method=photo）。 */
export async function confirmPhotoItemsAction(input: {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: string;
  items: Array<{
    name: string;
    quantity_g: number;
    calories: number;
    carb_g: number;
    protein_g: number;
    fat_g: number;
  }>;
}): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  if (!input.items.length) return { error: '沒有可寫入的項目' };

  const { data: log, error: logErr } = await supabase
    .from('food_logs')
    .insert({
      user_id: user.id,
      date: input.date,
      meal_type: input.mealType,
      method: 'photo',
    })
    .select('id')
    .single();

  if (logErr || !log) return { error: logErr?.message ?? '無法建立紀錄' };

  const rows = input.items.map((it) => ({
    log_id: log.id,
    name: it.name,
    quantity_g: it.quantity_g,
    calories: it.calories,
    carb_g: it.carb_g,
    protein_g: it.protein_g,
    fat_g: it.fat_g,
  }));

  const { error: itemErr } = await supabase.from('food_log_items').insert(rows);
  if (itemErr) return { error: itemErr.message };

  revalidatePath('/log');
  return {};
}

/** 由計畫「照吃但調整」進入 /log，使用者編輯後一次寫入並完成該餐打卡。 */
export async function commitPrefillFromPlanAction(input: {
  mealId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: Array<{
    name: string;
    quantity_g: number;
    calories: number;
    carb_g: number;
    protein_g: number;
    fat_g: number;
    fiber_g: number | null;
    sodium_mg: number | null;
  }>;
}): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  if (!input.items.length) return { error: '請至少保留一項食材' };

  const { data: meal, error: mealErr } = await supabase
    .from('meals')
    .select(
      `
      id,
      menu_id,
      type,
      daily_menus!inner (
        date,
        diet_plans!inner ( user_id )
      )
    `,
    )
    .eq('id', input.mealId)
    .single();

  if (mealErr || !meal) return { error: '找不到餐次' };

  const dm = meal.daily_menus as unknown as {
    date: string;
    diet_plans: { user_id: string };
  };

  if (dm.diet_plans.user_id !== user.id) return { error: '無權限' };

  if (meal.type !== input.mealType) return { error: '餐次不符' };

  if (dm.date !== input.date) return { error: '日期與該餐菜單不符' };

  const { data: existing } = await supabase
    .from('food_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('from_plan_meal_id', input.mealId)
    .maybeSingle();

  if (existing?.id) return { error: '此餐已建立過飲食紀錄' };

  const { data: logRow, error: logErr } = await supabase
    .from('food_logs')
    .insert({
      user_id: user.id,
      date: input.date,
      meal_type: input.mealType,
      method: 'manual',
      log_type: 'from_plan_modified',
      from_plan_meal_id: input.mealId,
    })
    .select('id')
    .single();

  if (logErr || !logRow) return { error: logErr?.message ?? '無法建立紀錄' };

  const rows = input.items.map((it) => ({
    log_id: logRow.id,
    name: it.name.trim() || '未命名',
    quantity_g: it.quantity_g,
    calories: it.calories,
    carb_g: it.carb_g,
    protein_g: it.protein_g,
    fat_g: it.fat_g,
    fiber_g: it.fiber_g,
    sodium_mg: it.sodium_mg,
    brand: null as string | null,
    is_verified: false as boolean | null,
  }));

  const { error: itemErr } = await supabase.from('food_log_items').insert(rows);
  if (itemErr) {
    await supabase.from('food_logs').delete().eq('id', logRow.id);
    return { error: itemErr.message };
  }

  const { error: upMealErr } = await supabase
    .from('meals')
    .update({
      is_checked_in: true,
      checked_in_at: new Date().toISOString(),
    })
    .eq('id', input.mealId);

  if (upMealErr) return { error: upMealErr.message };

  const refresh = await refreshDailyMenuCompletion(supabase, meal.menu_id);
  if (refresh.error) return { error: refresh.error };

  revalidatePath('/log');
  revalidatePath('/plan');
  return {};
}

