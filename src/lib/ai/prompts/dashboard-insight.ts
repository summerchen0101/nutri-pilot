/**
 * 首頁「今日建議」個人化補充（與規則引擎 bullet 合併）
 */
export function buildDashboardInsightPrompt(input: {
  todayKcal: number;
  targetKcal: number | null;
  carbG: number;
  proteinG: number;
  fatG: number;
  personalFacetsBrief: string;
}): string {
  const t =
    input.targetKcal != null && Number.isFinite(input.targetKcal) ?
      Math.round(input.targetKcal)
    : null;
  const fatR = Math.round(input.fatG);
  return `
你是 Nutri Pilot 的飲食建議助理。請依**今日營養數據**與**使用者個人化脈絡**產生最多 2 則**繁中**建議句（簡短、可執行、不恐嚇）。
語氣：專業但溫和；**非醫療診斷**；有慢性病／用藥相關脈絡時用「若你正在…建議諮詢醫師／營養師」類表述。

今日熱量約 ${Math.round(input.todayKcal)} kcal${t != null ? `，目標約 ${t} kcal` : ''}。
碳水約 ${Math.round(input.carbG)} g、蛋白質約 ${Math.round(input.proteinG)} g、脂肪約 ${fatR} g。

${input.personalFacetsBrief}

請只回傳 JSON：{ "bullets": string[] }，bullets 長度 0～2，每則不超過 80 字，不要其他鍵。
`.trim();
}
