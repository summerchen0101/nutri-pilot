/** @see docs/04-ai-engine.md */

export function buildMenuPrompt(params: {
  dietMethod: string;
  dailyCalTarget: number;
  carbPct: number;
  proteinPct: number;
  fatPct: number;
  avoidFoods: string[];
  allergens: string[];
  mealFrequency: number;
}): string {
  const dietMethodLabel: Record<string, string> = {
    mediterranean: '地中海飲食',
    keto: '生酮飲食',
    high_protein: '高蛋白飲食',
    low_cal: '低熱量飲食',
    intermittent: '間歇性斷食',
    dash: 'DASH 飲食',
    custom: '自訂飲食',
  };

  const label =
    dietMethodLabel[params.dietMethod] ?? params.dietMethod;

  const meals =
    params.mealFrequency === 3
      ? '早餐、午餐、晚餐'
      : '早餐、午餐、晚餐、點心';

  return `
你是專業的台灣營養師，熟悉台灣在地食材與飲食習慣。

請為以下用戶生成今日菜單，以 JSON 格式回傳。

用戶資料：
- 飲食方式：${label}
- 每日熱量目標：${params.dailyCalTarget} kcal
- 巨量營養素比例：碳水 ${params.carbPct}%，蛋白質 ${params.proteinPct}%，脂肪 ${params.fatPct}%
- 忌食清單：${params.avoidFoods.length > 0 ? params.avoidFoods.join('、') : '無'}
- 過敏原：${params.allergens.length > 0 ? params.allergens.join('、') : '無'}
- 餐次：${params.mealFrequency} 餐（${meals}）

要求：
1. 使用台灣常見食材，食物名稱用繁體中文
2. 每道菜需包含：name, quantity_g, calories, carb_g, protein_g, fat_g
3. 絕對不能含忌食食材與過敏原
4. 符合${label}的飲食原則
5. 四捨五入到小數點第一位

回傳格式（JSON）：
{
  "meals": [
    {
      "type": "breakfast",
      "scheduled_at": "08:00",
      "items": [
        { "name": "燕麥粥", "quantity_g": 80, "calories": 290, "carb_g": 50, "protein_g": 10, "fat_g": 5 }
      ]
    }
  ],
  "total_calories": 1800
}
`.trim();
}
