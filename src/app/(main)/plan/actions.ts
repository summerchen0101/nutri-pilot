'use server';

import { revalidatePath } from 'next/cache';

import { callClaudeJSON } from '@/lib/ai/claude';
import { buildSwapPrompt } from '@/lib/ai/prompts/swap-ingredient';
import { refreshDailyMenuCompletion } from '@/lib/plan/menu-completion';
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
