/**
 * Claude 食物營養估算（每 100g）
 * @see lib/food/search.ts estimateWithClaude
 */
export function FOOD_ESTIMATE_PROMPT(foodName: string): string {
  const q = foodName.trim();
  return `你是營養資料助理。請依常見市售或居家料理，估算下列食物「每 100 公克可食部」的營養成分（數字需合理；若有多種可能，取台灣常見版本）。

食物名稱：${q}

請回傳單一 JSON 物件（不要陣列），欄位如下（皆為數字；缺資料可用 0）：
- name：字串，標準化後的食物名稱（可用繁體中文）
- brand：字串或 null（無品牌則 null）
- calories_per_100g：大卡（kcal）
- carb_g_per_100g：碳水化合物公克
- protein_g_per_100g：蛋白質公克
- fat_g_per_100g：脂肪公克
- fiber_g_per_100g：膳食纖維公克（可選，未知則 null）
- sodium_mg_per_100g：鈉毫克（可選，未知則 null）`;
}
