'use server';

import { revalidatePath } from 'next/cache';

import { callClaudeJSON } from '@/lib/ai/claude';
import { buildSwapPrompt } from '@/lib/ai/prompts/swap-ingredient';
import { createClient } from '@/lib/supabase/server';

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

/** 將 AI 建議的替代食材寫入計畫菜單，並更新該餐／當日熱量加總。 */
export async function applySwapAlternativeAction(input: {
  mealItemId: string;
  alternative: SwapAlternative;
}): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const alt = input.alternative;

  const { data: itemRow, error: itemErr } = await supabase
    .from('meal_items')
    .select('id, meal_id')
    .eq('id', input.mealItemId)
    .maybeSingle();

  if (itemErr) return { error: itemErr.message };
  if (!itemRow) return { error: '找不到項目' };

  const { data: mealRow, error: mealErr } = await supabase
    .from('meals')
    .select(
      `
      id,
      menu_id,
      daily_menus!inner (
        id,
        diet_plans!inner ( user_id )
      )
    `,
    )
    .eq('id', itemRow.meal_id)
    .maybeSingle();

  if (mealErr) return { error: mealErr.message };
  if (!mealRow) return { error: '找不到餐次' };

  const dm = mealRow.daily_menus as unknown as {
    id: string;
    diet_plans: { user_id: string };
  };

  if (dm.diet_plans.user_id !== user.id) {
    return { error: '無權限' };
  }

  const mealId = mealRow.id;
  const menuId = mealRow.menu_id;

  const { error: upErr } = await supabase
    .from('meal_items')
    .update({
      name: alt.name,
      quantity_g: alt.quantity_g,
      calories: alt.calories,
      carb_g: alt.carb_g,
      protein_g: alt.protein_g,
      fat_g: alt.fat_g,
      fiber_g: null,
      sodium_mg: null,
    })
    .eq('id', input.mealItemId);

  if (upErr) return { error: upErr.message };

  const { data: items, error: itemsErr } = await supabase
    .from('meal_items')
    .select('calories')
    .eq('meal_id', mealId);

  if (itemsErr) return { error: itemsErr.message };

  const mealTotal = items?.reduce((s, r) => s + Number(r.calories), 0) ?? 0;

  const { error: mealUpErr } = await supabase
    .from('meals')
    .update({ total_calories: mealTotal })
    .eq('id', mealId);

  if (mealUpErr) return { error: mealUpErr.message };

  const { data: meals, error: mealsErr } = await supabase
    .from('meals')
    .select('total_calories')
    .eq('menu_id', menuId);

  if (mealsErr) return { error: mealsErr.message };

  const menuTotal =
    meals?.reduce((s, r) => s + Number(r.total_calories ?? 0), 0) ?? 0;

  const { error: menuUpErr } = await supabase
    .from('daily_menus')
    .update({ total_calories: menuTotal })
    .eq('id', menuId);

  if (menuUpErr) return { error: menuUpErr.message };

  revalidatePath('/plan');
  return {};
}
