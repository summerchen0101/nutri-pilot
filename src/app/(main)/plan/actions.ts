'use server';

import { revalidatePath } from 'next/cache';

import { callClaudeJSON } from '@/lib/ai/claude';
import { buildSwapPrompt } from '@/lib/ai/prompts/swap-ingredient';
import { createClient } from '@/lib/supabase/server';

export async function checkInMeal(mealId: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data: meal, error: mealErr } = await supabase
    .from('meals')
    .select('id, menu_id')
    .eq('id', mealId)
    .single();

  if (mealErr || !meal) return { error: '找不到餐次' };

  const { data: dm } = await supabase
    .from('daily_menus')
    .select('id, plan_id')
    .eq('id', meal.menu_id)
    .single();

  if (!dm) return { error: '找不到菜單' };

  const { data: dp } = await supabase
    .from('diet_plans')
    .select('user_id')
    .eq('id', dm.plan_id)
    .single();

  if (!dp || dp.user_id !== user.id) return { error: '無權限' };

  const { error: upErr } = await supabase
    .from('meals')
    .update({
      is_checked_in: true,
      checked_in_at: new Date().toISOString(),
    })
    .eq('id', mealId);

  if (upErr) return { error: upErr.message };

  const { data: meals } = await supabase
    .from('meals')
    .select('is_checked_in')
    .eq('menu_id', meal.menu_id);

  const total = meals?.length ?? 0;
  const checked = meals?.filter((m) => m.is_checked_in).length ?? 0;
  const completionPct = total ? Math.round((checked / total) * 1000) / 10 : 0;

  await supabase
    .from('daily_menus')
    .update({
      completion_pct: completionPct,
      is_completed: total > 0 && checked === total,
    })
    .eq('id', meal.menu_id);

  revalidatePath('/plan');
  return {};
}

export interface SwapAlternative {
  name: string;
  quantity_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  reason: string;
}

export async function swapMealItemAction(input: {
  originalFood: string;
  originalCalories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  dietMethod: string;
  avoidFoods: string[];
}): Promise<{ alternatives?: SwapAlternative[]; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: '伺服器未設定 ANTHROPIC_API_KEY' };
  }

  try {
    const prompt = buildSwapPrompt({
      originalFood: input.originalFood,
      originalCalories: input.originalCalories,
      originalNutrition: {
        carb_g: input.carb_g,
        protein_g: input.protein_g,
        fat_g: input.fat_g,
      },
      dietMethod: input.dietMethod,
      avoidFoods: input.avoidFoods,
    });

    const alternatives = await callClaudeJSON<SwapAlternative[]>(prompt);
    return { alternatives };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '換食材失敗' };
  }
}
