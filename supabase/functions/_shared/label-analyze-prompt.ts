/**
 * 營養標／成分表拍照分析；須與 src/lib/food/label-analysis-result.ts 型別語意對齊。
 */
export function buildLabelAnalyzePrompt(ctx: {
  userAgeYears: number;
  allergens: string[];
  avoidFoods: string[];
  tracksGlycemicConcern: boolean;
}): string {
  const allergenLine =
    ctx.allergens.length > 0
      ? ctx.allergens.join("、")
      : "（使用者未填過敏原）";
  const avoidLine =
    ctx.avoidFoods.length > 0
      ? ctx.avoidFoods.join("、")
      : "（使用者未填忌食）";

  return `你是營養標示與食品成分顧問。請閱讀圖片中的中文或英文營養標示、成分表、警語。

使用者脈絡（供個人化提示，非醫療診斷）：
- 約 ${ctx.userAgeYears} 歲
- 自述過敏原：${allergenLine}
- 自述忌食偏好：${avoidLine}
- 使用者希望加強血糖／糖分相關提醒：${ctx.tracksGlycemicConcern ? "是" : "否"}

規則：
1. 僅依圖片可讀文字推論；看不清楚請在 summary_bullets 說明「辨識不清」。
2. 避免斷言醫療安全性；用「建議留意」「如有疑慮請諮詢醫師」等語氣。
3. 添加物：列出常見代碼或名稱（如防腐劑、著色劑、甜味劑）；concern_level 為相對強度（low/medium/high），並簡述原因。
4. audience_flags：依成分與標示字樣推論嬰幼兒不適用、兒童留意、長者留意、高糖疑慮（tracksGlycemicConcern 為 true 時可加強高糖相關說明）。
5. allergen_match：若成分表似乎含使用者過敏原類別，標 match true 並簡述。
6. age_advisory_text：若有「○歲以上」或類似警語請摘錄；否則 null。

請只回傳一個 JSON 物件（不要 markdown），鍵如下：
{
  "_kind": "label_analysis",
  "product_name_guess": string | null,
  "ingredients_detected": string[],
  "additives": [{ "code": string | null, "name": string, "note": string, "concern_level": "low" | "medium" | "high" }],
  "audience_flags": {
    "not_suitable_infant": boolean,
    "child_caution": boolean,
    "elderly_caution": boolean,
    "high_sugar_concern": boolean
  },
  "allergen_match": { "match": boolean, "detail": string | null },
  "age_advisory_text": string | null,
  "summary_bullets": string[],
  "disclaimer_required": true
}`;
}
