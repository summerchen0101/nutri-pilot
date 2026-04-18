/** Claude 菜單生成 JSON（非 DB 型別） */

export interface GeneratedMenuMealItem {
  name: string;
  quantity_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
}

export interface GeneratedMenuMeal {
  type: string;
  scheduled_at: string;
  items: GeneratedMenuMealItem[];
}

export interface GeneratedMenuPayload {
  meals: GeneratedMenuMeal[];
  total_calories: number;
}
