import { ACTIVITY_TYPE_LABEL } from '@/lib/activity/activity-type-labels';

function activitySlugListForPrompt(): string {
  return (
    Object.entries(ACTIVITY_TYPE_LABEL) as [string, string][]
  )
    .map(([slug, zh]) => `- ${slug}（${zh}）`)
    .join('\n');
}

export function buildQuickLogIntentPrompt(input: {
  referenceDateIso: string;
  userMessage: string;
  waterMlKnownToday: number | null;
  /** 使用者是否附上餐點／食物照片 */
  hasAttachedImage?: boolean;
  /** 由 `personalFacetsToPromptBrief` 產生；空字串則略過 */
  personalFacetsBrief?: string;
}): string {
  const safeMsg = input.userMessage.replace(/`/g, "'").trim().slice(0, 2500);
  const waterHint =
    input.waterMlKnownToday != null &&
    Number.isFinite(input.waterMlKnownToday) ?
      `目前使用者在 ${input.referenceDateIso} 已紀錄飲水約 ${Math.round(input.waterMlKnownToday)} ml（若使用者說「再喝」「又喝了」等增量，請將 waterMlTotal 設為 此值加上增量；若表達的是當日總量則直接使用總量）。`
    : `未提供當日既有飲水量；若使用者描述「喝了 X ml」且語意為當日總量，將 waterMlTotal 設為 X；若明顯為单次增量且無法推算總量，將 waterMlTotal 設為該增量（保守假設從 0 開始的一天）。`;

  const personalBlock =
    input.personalFacetsBrief && input.personalFacetsBrief.trim().length > 0 ?
      `\n${input.personalFacetsBrief.trim()}\n`
    : '';

  const imageRules =
    input.hasAttachedImage ?
      `
12. **附圖**：使用者附上餐點／食物照片。請辨識照片中所有可見食物，與文字描述（若有）合併估算；多品項拆成多筆 food entries。
13. **僅照片、無文字**：依參考日 ${input.referenceDateIso} 與畫面內容推斷 mealType（早餐／午餐／晚餐／點心）；不得臆造照片中看不見的食物。
14. 附圖時仍適用「一事實一筆」；非飲食類（運動、體重等）僅在使用者文字明確提及時才輸出。
`
    : '';

  const userInputBlock =
    input.hasAttachedImage && safeMsg.length < 1 ?
      '使用者僅附上照片，無文字描述。'
    : `使用者輸入：\n「${safeMsg || '（空白）'}」`;

  return `
你是 Nutri Pilot 健康紀錄助手。使用者用繁體中文（台灣）描述飲食、運動或生活數據。
參考日期（今天）為：${input.referenceDateIso}。
${waterHint}
${personalBlock}
請解析使用者意圖，產生 0 至多筆紀錄。**每個事實一筆**：若同一段話包含多個獨立紀錄請拆成多個 entries。

規則：
1. 預設日期使用 ${input.referenceDateIso}，除非使用者明確說其他日期（仍以 YYYY-MM-DD 輸出）。
2. **飲食**：若有具體食物與份量，估算營養（台灣在地常見食物與份量），數值四捨五入為整數。
3. **餐別 mealType**：breakfast／lunch／dinner／snack；若不確定請依時間用語或「早餐／午餐／晚餐／點心」推理，無法判斷則 snack。
4. **運動 activityType** 只能是下列英文 slug（擇一）：
${activitySlugListForPrompt()}
5. 運動 durationMinutes 為 1–1440 的整數（分鐘）。
6. **體重 weightKg**：15–400，一位小數可接受（系統會處理）。
7. **飲水 waterMlTotal**：0–8000 的整日總飲水量（ml）。
8. **睡眠 sleepHours**：0–24（小時，可一位小數）。
9. 若資訊不足或無法安全估算，請回傳空 entries，並在 summary_zh 簡短說明缺少什麼。
10. 不要臆造使用者沒提到的項目。
11. 若有個人化脈絡區塊，估熱量／食材時可溫和留意（仍不得臆造未提及的食物）。
${imageRules}
請只回傳 JSON（物件），格式如下（欄位名稱與類型請嚴格遵守）：
{
  "summary_zh": "對使用者的簡短說明（可為 null）",
  "entries": [
    {
      "kind": "food",
      "mealType": "breakfast"|"lunch"|"dinner"|"snack",
      "date": "YYYY-MM-DD",
      "name": "食物名稱",
      "quantity_g": 數字,
      "calories": 數字,
      "carb_g": 數字,
      "protein_g": 數字,
      "fat_g": 數字,
      "fiber_g": 數字或null,
      "sodium_mg": 數字或null
    },
    {
      "kind": "activity",
      "loggedDate": "YYYY-MM-DD",
      "activityType": "必填英文slug見上列",
      "durationMinutes": 整數,
      "caloriesEst": 數字或null,
      "notes": "字串或null"
    },
    {
      "kind": "weight",
      "dateIso": "YYYY-MM-DD",
      "weightKg": 數字
    },
    {
      "kind": "water",
      "dateIso": "YYYY-MM-DD",
      "waterMlTotal": 整數
    },
    {
      "kind": "sleep",
      "dateIso": "YYYY-MM-DD",
      "sleepHours": 數字
    }
  ]
}

${userInputBlock}
`.trim();
}
