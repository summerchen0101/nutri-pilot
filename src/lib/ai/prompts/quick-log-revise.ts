import { ACTIVITY_TYPE_LABEL } from '@/lib/activity/activity-type-labels';

function activitySlugListForPrompt(): string {
  return (
    Object.entries(ACTIVITY_TYPE_LABEL) as [string, string][]
  )
    .map(([slug, zh]) => `- ${slug}（${zh}）`)
    .join('\n');
}

const QUICK_LOG_JSON_SCHEMA = `
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
`.trim();

export function buildQuickLogRevisePrompt(input: {
  referenceDateIso: string;
  waterMlKnownToday: number | null;
  currentEntriesJson: string;
  revisionInstruction: string;
  personalFacetsBrief?: string;
}): string {
  const safeRevision = input.revisionInstruction
    .replace(/`/g, "'")
    .trim()
    .slice(0, 500);

  const waterHint =
    input.waterMlKnownToday != null &&
    Number.isFinite(input.waterMlKnownToday) ?
      `目前使用者在 ${input.referenceDateIso} 已紀錄飲水約 ${Math.round(input.waterMlKnownToday)} ml。`
    : `未提供當日既有飲水量。`;

  const personalBlock =
    input.personalFacetsBrief && input.personalFacetsBrief.trim().length > 0 ?
      `\n${input.personalFacetsBrief.trim()}\n`
    : '';

  return `
你是 Nutri Pilot 健康紀錄助手。使用者已有一組「預覽中的紀錄」（JSON），並提出修正說明。
參考日期為：${input.referenceDateIso}。
${waterHint}
${personalBlock}
任務：依修正說明調整預覽內容，輸出**完整**更新後的 entries（非 diff）。

規則：
1. 以「目前預覽」為基礎，僅依修正說明變更相關欄位或筆數；未提及的項目盡量保留原值。
2. 若使用者要求刪除某筆，從 entries 移除；若要求新增且說明清楚，可新增對應筆。
3. 不得無故清空全部 entries；若無法理解修正，可保留原 entries 並在 summary_zh 簡短說明。
4. 預設日期使用 ${input.referenceDateIso}，除非原資料或修正說明明確其他日期。
5. **運動 activityType** 只能是下列英文 slug：
${activitySlugListForPrompt()}
6. 數值四捨五入為整數（體重／睡眠可一位小數）。
7. 不要臆造修正說明與原預覽都未提及的項目。

目前預覽（JSON）：
${input.currentEntriesJson}

使用者修正說明：
「${safeRevision}」

${QUICK_LOG_JSON_SCHEMA}
`.trim();
}
