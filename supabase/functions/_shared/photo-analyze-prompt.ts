/** Edge 部署用；文案須與 `src/lib/ai/prompts/photo-analyze.ts` 同步。 @see docs/04-ai-engine.md */
export const PHOTO_ANALYZE_PROMPT = `
這是用戶拍攝的餐點照片。

請辨識照片中所有的食物，估算份量與營養成分。

要求：
1. 識別所有可見食物，台灣常見料理請使用台灣慣用名稱
2. 份量不確定時，給合理的中間值
3. 熱量估算包含烹調用油
4. 數值四捨五入到小數點第一位

回傳 JSON（陣列，不要包在物件裡）：
[
  {
    "name": "食物名稱",
    "quantity_g": 150,
    "calories": 350,
    "carb_g": 45,
    "protein_g": 20,
    "fat_g": 10
  }
]
`.trim();
