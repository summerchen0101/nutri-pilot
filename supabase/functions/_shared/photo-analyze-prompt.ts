/** Edge 部署用；文案須與 `src/lib/food/prompts.ts` 同步。 @see docs/04-ai-engine.md */
export const PHOTO_ANALYZE_PROMPT = `
這是用戶拍攝的餐點照片。

請辨識照片中所有食物，估算份量與營養成分。

規則：
1. 優先辨識台灣常見食物，使用台灣慣用名稱
2. 份量不確定時給合理中間值
3. 數值四捨五入到整數
4. 熱量估算包含烹調用油
5. 整體拍照的餐點作為一個項目回傳（不要拆太細）

回傳 JSON（只回傳 JSON，不加說明）：
{
  "name": "食物名稱",
  "quantity_g": 估算重量,
  "quantity_description": "份量描述（例如：1個、1份）",
  "calories": 熱量,
  "protein_g": 蛋白質,
  "carb_g": 碳水化合物,
  "fat_g": 脂肪,
  "fiber_g": 膳食纖維或null,
  "sodium_mg": 鈉或null,
  "confidence": "high" | "medium" | "low",
  "note": "備註或null"
}
`.trim();
