/** 拍照辨識；須與 `supabase/functions/_shared/photo-analyze-prompt.ts` 同步。 */
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

function escapeManualInputFragment(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, "'").slice(0, 2000);
}

export function buildManualInputPrompt(
  input: string,
  referenceLines?: string[],
): string {
  const safe = escapeManualInputFragment(input.trim());
  const lines = referenceLines?.filter((l) => l.trim().length > 0) ?? [];
  const refBlock =
    lines.length > 0 ?
      `

資料庫參考（若下列與用戶描述相關，可輔助校準每 100g 營養；仍以用戶描述的實際份量為準）：
${lines.join('\n')}`
    : '';

  return `
用戶輸入：「${safe}」
${refBlock}

你是台灣的專業營養師，請分析以上食物的營養成分。

規則：
1. 從用戶描述中解析食物名稱與份量
2. 份量不明確時，用台灣常見的標準份量估算
3. 優先參考台灣在地食物的營養數值
4. 如果是複合食物（如珍珠奶茶），整體估算不要拆分
5. 數值四捨五入到整數

confidence 判斷標準：
- high：常見標準食物（雞塊、白飯、水煮蛋）
- medium：有地區差異的食物（便當、珍珠奶茶）
- low：描述模糊或罕見食物

回傳 JSON（只回傳 JSON，不加任何說明），範例結構：
{
  "name": "雞塊 x4",
  "quantity_g": 120,
  "quantity_description": "4個",
  "calories": 380,
  "protein_g": 18,
  "carb_g": 42,
  "fat_g": 12,
  "fiber_g": null,
  "sodium_mg": null,
  "confidence": "medium",
  "note": null
}
`;
}
