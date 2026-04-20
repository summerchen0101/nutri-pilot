'use server';

import { revalidatePath } from 'next/cache';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

function enqueueAiEstimateFoodCacheInsert(
  supabase: SupabaseClient,
  item: {
    name: string;
    quantity_g: number;
    calories: number;
    carb_g: number;
    protein_g: number;
    fat_g: number;
    fiber_g: number | null;
    sodium_mg: number | null;
  },
): void {
  const q = Number(item.quantity_g);
  if (!Number.isFinite(q) || q <= 0) return;

  const scale = 100 / q;

  void supabase.from('food_cache').insert({
    source: 'ai_estimate',
    name: item.name.trim().slice(0, 500) || '未命名',
    alias: null,
    brand: null,
    off_code: null,
    external_id: null,
    calories_per_100g: Math.round(Number(item.calories) * scale),
    carb_g_per_100g: Math.round(Number(item.carb_g) * scale),
    protein_g_per_100g: Math.round(Number(item.protein_g) * scale),
    fat_g_per_100g: Math.round(Number(item.fat_g) * scale),
    fiber_g_per_100g:
      item.fiber_g == null
        ? null
        : Math.round(Number(item.fiber_g) * scale * 10) / 10,
    sodium_mg_per_100g:
      item.sodium_mg == null
        ? null
        : Math.round(Number(item.sodium_mg) * scale),
    is_verified: false,
  });
}

export async function addFoodFromAiAnalysisAction(input: {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: string;
  name: string;
  quantity_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number | null;
  sodium_mg: number | null;
}): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const q = Number(input.quantity_g);
  if (!Number.isFinite(q) || q <= 0) {
    return { error: '份量無效' };
  }

  const { data: log, error: logErr } = await supabase
    .from('food_logs')
    .insert({
      user_id: user.id,
      date: input.date,
      meal_type: input.mealType,
      method: 'ai_analysis',
      log_type: 'manual',
    })
    .select('id')
    .single();

  if (logErr || !log) return { error: logErr?.message ?? '無法建立紀錄' };

  const { error: itemErr } = await supabase.from('food_log_items').insert({
    log_id: log.id,
    name: input.name.trim() || '未命名',
    quantity_g: q,
    calories: Math.round(Number(input.calories)),
    carb_g: Math.round(Number(input.carb_g)),
    protein_g: Math.round(Number(input.protein_g)),
    fat_g: Math.round(Number(input.fat_g)),
    fiber_g:
      input.fiber_g == null ? null : Math.round(Number(input.fiber_g)),
    sodium_mg:
      input.sodium_mg == null ? null : Math.round(Number(input.sodium_mg)),
    brand: null,
    is_verified: false,
  });

  if (itemErr) return { error: itemErr.message };

  enqueueAiEstimateFoodCacheInsert(supabase, {
    name: input.name,
    quantity_g: q,
    calories: input.calories,
    carb_g: input.carb_g,
    protein_g: input.protein_g,
    fat_g: input.fat_g,
    fiber_g: input.fiber_g,
    sodium_mg: input.sodium_mg,
  });

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
    fiber_g: number | null;
    sodium_mg: number | null;
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
    name: it.name.trim() || '未命名',
    quantity_g: it.quantity_g,
    calories: Math.round(Number(it.calories)),
    carb_g: Math.round(Number(it.carb_g)),
    protein_g: Math.round(Number(it.protein_g)),
    fat_g: Math.round(Number(it.fat_g)),
    fiber_g:
      it.fiber_g == null ? null : Math.round(Number(it.fiber_g)),
    sodium_mg:
      it.sodium_mg == null ? null : Math.round(Number(it.sodium_mg)),
    brand: null as string | null,
    is_verified: false as boolean | null,
  }));

  const { error: itemErr } = await supabase.from('food_log_items').insert(rows);
  if (itemErr) return { error: itemErr.message };

  revalidatePath('/log');
  return {};
}

export async function commitPrefillFromPlanAction(_: {
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
  return { error: '飲食計畫功能已下線，請改用手動輸入或拍照記錄。' };
}

