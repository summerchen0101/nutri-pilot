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
  /** 由 personalFacetsJsonToPromptBrief 產生；空字串可略 */
  personalFacetsBrief?: string;
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
${
  ctx.personalFacetsBrief && ctx.personalFacetsBrief.trim().length > 0
    ? `\n個人化自述整理（供語氣參考）：\n${ctx.personalFacetsBrief.trim()}\n`
    : ""
}
規則：
1. 僅依圖片可讀文字推論；看不清請在 alert_keywords 或 summary_note 說明「辨識不清」。成分表看不清時勿憑空捏造添加物。
2. 避免斷言醫療安全性；用「建議留意」「如有疑慮請諮詢醫師」等語氣。
3. 食品添加物（優先讀「成分」或「原料」欄）：
   - 若看見具體添加物名稱，以具名列入 risk_items 與 alert_keywords，可附類別，例：「檸檬黃（增色劑）」。
   - 功能類別與常見成分對照（辨識到具名時請標註對應類別詞）：
     · 膨鬆劑：碳酸氫鈉、碳酸氫銨、焦磷酸二鈉、磷酸二氫鈣
     · 調味劑：麩酸鈉／味精、5'-次黃嘌呤核苷酸二鈉、5'-鳥嘌呤核苷酸二鈉、琥珀酸二鈉
     · 增色劑／著色劑：檸檬黃、日落黃、紅色40號、胭脂紅、Allura Red、Yellow 5/6
     · 防腐劑：苯甲酸、苯甲酸鈉、己二烯酸、己二烯酸鉀、山梨酸鉀、去水醋酸
     · 乳化劑：脂肪酸甘油酯、單／雙甘油酯、大豆卵磷脂
     · 增稠劑：關華豆膠、刺槐豆膠、卡拉膠、玉米糖膠
     · 酸度調節劑：檸檬酸、乳酸、磷酸
     · 抗氧化劑：BHA、BHT、抗壞血酸（維生素C）
     · 漂白劑：過氧化苯甲醯（麵粉類）
     · 品質改良劑：磷酸鹽類（焦磷酸鹽等）
     · 甜味劑：阿斯巴甜、蔗糖素、糖精、醋磺內酯鉀
   - 成分表含多項添加物時，alert_keywords 至少含 1 個類別詞（如「防腐劑」「增色劑」）與 1～2 個具名成分（仍維持 alert_keywords 總數 3–12）。
4. 高鈉（讀營養標示「鈉」欄，非醫療診斷）：
   - 每 100g 或每 100ml 鈉 ≥ 600mg → alert_keywords 必含「高鈉」或「高鈉含量」，且 risk_items 一筆 tier=watch、name 為「高鈉」；plain_language 帶可讀數值（例：每份鈉約 980mg，接近一般成人一日參考量 2400mg 的比例，高血壓或限鈉者宜控份量）。
   - 僅標示每份鈉且每份 ≥ 600mg，或泡麵／醬料／加工肉等明顯偏高 → 同上。
   - 判為高鈉時，audience_advice 的 general_adult 與 elderly 摘要須提及控鈉與份量。
5. 風險分級 risk_items：tier 僅能為 high、medium、watch、low。
   - high：反式脂肪、高果糖玉米糖漿、亞硝酸鈉／亞硝酸鹽、具名合成色素（黃色5/6、Red 40、檸檬黃、日落黃等）、加工品中苯甲酸鈉等防腐劑明顯。
   - medium：棕櫚油、精製糖、多種添加物疊加、阿斯巴甜、卡拉膠、MSG、同功能添加物 ≥2 種（如兩種防腐劑或兩種色素）。
   - watch：咖啡因、酒精、高鈉、高飽和脂肪、山梨酸鉀、單一常見添加物。
   - low：天然香料、維生素強化、抗壞血酸（抗氧化用途）、卵磷脂。
   每一筆必須有 plain_language：一句白話說明對使用者的可能影響。
6. alert_keywords：3–12 個短語（如「膨鬆劑」「檸檬黃」「高鈉」「苯甲酸鈉」），呼應成分表與營養標示重點。
7. audience_advice：segment 只能是 child、elderly、pregnant_lactation、allergy、general_adult；summary 為一句繁中摘要（可含「建議避免／諮詢醫師／適量」）。
8. allergens_tw14：必須剛好 14 筆，category_key 只能從下列值擇一且不重複：[${categoryKeysJson}]。
   語意對照（輸出 key 用英文蛇形）：mango 芒果；peanut 花生；egg 蛋；milk 牛乳／奶；nuts 堅果；sesame 芝麻；gluten_cereals 含麩質之穀物；soybean 大豆；fish 魚類；shellfish 軟體／貝類；crustacean 甲殼類；celery 芹菜；mustard 芥末；sulfite 亞硫酸鹽／二氧化硫殘留。
   若圖片未提及該類，detected 為 false；detail 可簡述依據或 null。
9. safety_score：0–100 整數；依 high/medium/watch 項目數量與嚴重度加權扣分（100 為理想、越低表示越需留意）。此為推估，非認證或醫療判定。
10. summary_note：可選，一句總結（若無則 null）。

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
