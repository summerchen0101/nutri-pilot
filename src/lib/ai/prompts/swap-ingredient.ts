/** @see docs/04-ai-engine.md */

export function buildSwapPrompt(params: {
  originalFood: string;
  originalCalories: number;
  originalNutrition: { carb_g: number; protein_g: number; fat_g: number };
  dietMethod: string;
  avoidFoods: string[];
}): string {
  return `
原食材：${params.originalFood}（${params.originalCalories} kcal）
  碳水：${params.originalNutrition.carb_g}g，蛋白質：${params.originalNutrition.protein_g}g，脂肪：${params.originalNutrition.fat_g}g

飲食方式：${params.dietMethod}
忌食：${params.avoidFoods.join('、') || '無'}

請推薦 3 個台灣常見的替代食材，條件：
1. 熱量相近（±50 kcal 以內）
2. 符合飲食法原則
3. 排除忌食清單
4. 說明為何適合替換

回傳 JSON：
[
  {
    "name": "食材名稱",
    "quantity_g": 100,
    "calories": 300,
    "carb_g": 40,
    "protein_g": 15,
    "fat_g": 8,
    "reason": "替換原因（一句話）"
  }
]
`.trim();
}
