/**
 * 食品標示智慧分析（食品安全守衛）報告；須與 src/lib/food/label-guard-report.ts 型別對齊。
 *
 * 台灣過敏原標示：請依圖片可讀文字，對下列 14 類強制標示項目逐項判斷 detected（僅依成分表／警語推論）。
 */
export const TW_ALLERGEN_CATEGORY_KEYS = [
  "mango",
  "peanut",
  "egg",
  "milk",
  "nuts",
  "sesame",
  "gluten_cereals",
  "soybean",
  "fish",
  "shellfish",
  "crustacean",
  "celery",
  "mustard",
  "sulfite",
] as const;

export type TwAllergenCategoryKey = (typeof TW_ALLERGEN_CATEGORY_KEYS)[number];

export function buildLabelGuardReportPrompt(ctx: {
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

  const categoryKeysJson = TW_ALLERGEN_CATEGORY_KEYS.map((k) => `"${k}"`).join(
    ", ",
  );

  return `你是台灣食品標示與成分顧問。請閱讀圖片中的中文或英文營養標示、成分表、過敏原警語。

使用者脈絡（個人化提示，非醫療診斷）：
- 約 ${ctx.userAgeYears} 歲
- 自述過敏原：${allergenLine}
- 自述忌食偏好：${avoidLine}
- 使用者希望加強血糖／糖分相關提醒：${ctx.tracksGlycemicConcern ? "是" : "否"}

規則：
1. 僅依圖片可讀文字推論；看不清請在 alert_keywords 或 summary_note 說明「辨識不清」。
2. 避免斷言醫療安全性；用「建議留意」「如有疑慮請諮詢醫師」等語氣。
3. 風險分級 risk_items：tier 僅能為 high、medium、watch、low。
   - high：反式脂肪、高果糖玉米糖漿、亞硝酸鈉、特定人工色素（如 Red 40、黃色 5/6）明顯、苯甲酸鈉疑似超量等（依圖片與合理推論）。
   - medium：棕櫚油、精製糖、磷酸鹽、MSG、阿斯巴甜、卡拉膠等。
   - watch：咖啡因、酒精、高鈉、高飽和脂肪、山梨酸鉀等需留意項。
   - low：天然香料、維生素添加、卵磷脂、抗壞血酸等通常風險較低者。
   每一筆必須有 plain_language：一句白話說明「對使用者的可能影響」（例如棕櫚油：飽和脂肪偏高，心血管疾病風險族群建議少吃）。
4. alert_keywords：3–12 個短語（如「棕櫚油」「高鈉」「人工色素」），呼應圖片重點。
5. audience_advice：segment 只能是 child、elderly、pregnant_lactation、allergy、general_adult；summary 為一句繁中摘要（可含「建議避免／諮詢醫師／適量」）。
6. allergens_tw14：必須剛好 14 筆，category_key 只能從下列值擇一且不重複：[${categoryKeysJson}]。
   語意對照（輸出 key 用英文蛇形）：mango 芒果；peanut 花生；egg 蛋；milk 牛乳／奶；nuts 堅果；sesame 芝麻；gluten_cereals 含麩質之穀物；soybean 大豆；fish 魚類；shellfish 軟體／貝類；crustacean 甲殼類；celery 芹菜；mustard 芥末；sulfite 亞硫酸鹽／二氧化硫殘留。
   若圖片未提及該類，detected 為 false；detail 可簡述依據或 null。
7. safety_score：0–100 整數；依 high/medium/watch 項目數量與嚴重度加權扣分（100 為理想、越低表示越需留意）。此為推估，非認證或醫療判定。
8. summary_note：可選，一句總結（若無則 null）。

請只回傳一個 JSON 物件（不要 markdown），鍵如下：
{
  "_kind": "label_guard_report",
  "safety_score": number,
  "alert_keywords": string[],
  "risk_items": [{ "name": string, "tier": "high" | "medium" | "watch" | "low", "plain_language": string }],
  "audience_advice": [{ "segment": "child" | "elderly" | "pregnant_lactation" | "allergy" | "general_adult", "summary": string }],
  "allergens_tw14": [{ "category_key": string, "detected": boolean, "detail": string | null }],
  "summary_note": string | null,
  "disclaimer_required": true
}`;
}
