import type { ManualFoodAnalysisResult } from '@/lib/food/manual-food-analysis-result';

export interface LogItemSnapshot {
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
}

export interface FoodLogSnapshot {
  id: string;
  meal_type: string;
  method: string;
  logged_at: string | null;
  food_log_items: LogItemSnapshot[] | null;
}

export const MEAL_LABEL: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

export const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export function logItemToManualResult(
  it: LogItemSnapshot,
): ManualFoodAnalysisResult {
  const q = Math.round(Number(it.quantity_g));
  return {
    name: it.name,
    quantity_g: q > 0 ? q : 1,
    quantity_description: '',
    calories: Math.round(Number(it.calories)),
    protein_g: Math.round(Number(it.protein_g)),
    carb_g: Math.round(Number(it.carb_g)),
    fat_g: Math.round(Number(it.fat_g)),
    fiber_g: it.fiber_g,
    sodium_mg: it.sodium_mg,
  };
}

export function totalDayKcalFromLogs(logs: FoodLogSnapshot[]): number {
  let t = 0;
  for (const log of logs) {
    for (const it of log.food_log_items ?? []) {
      t += Number(it.calories);
    }
  }
  return t;
}
