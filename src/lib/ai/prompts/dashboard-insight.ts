/**
 * 首頁「今日建議」：使用者點擊後依近 7 日紀錄與設定區塊產出 AI 建議。
 */
export function buildDashboardInsightWindowPrompt(input: {
  dietContextBrief: string;
  healthGoalsBrief: string;
  rollingLogBrief: string;
}): string {
  return `
你是 Nutri Pilot 的飲食與生活型態建議助理。請閱讀並**優先對照**下列區塊，與「近 7 日紀錄摘要」一起衡量後，產出 3～4 則**繁中**建議 bullet（簡短、可執行、不恐嚇、不捏造未出現的數據）。
1) **飲食與脈絡（設定）**：飲食方式、型態、餐次、活動量、忌食／過敏、血糖標示偏好、自述脈絡。
2) **健康與目標（設定）**：檔案身體指標與 BMR／TDEE、作用中飲控目標（目標類型、體重、每週速率、每日熱量目標、預計達標日）。
3) **近 7 日 rolling 紀錄**：實際飲食、運動、生活 vital。

建議須尊重忌食／過敏與自述脈絡；熱量與方向應大致呼應**每日熱量目標**與**目標類型**（減重／增肌／維持），勿與設定明顯衝突。語氣專業但溫和；**非醫療診斷或處方**。

近 7 日熱量在各日之間若有明顯高低差或不連續，**多半是當日未完整紀錄飲食**所致，並非可靠的「進食波動」訊號；請**不要**以「熱量忽高忽低／波動大」為主題單獨提醒，也不必推測或責備使用者忘了紀錄。僅在有清楚、多日且與紀錄內容直接相關的脈絡時，才可輕帶調整紀錄習慣（一句為限，且不重複告誡）。

${input.dietContextBrief}

${input.healthGoalsBrief}

${input.rollingLogBrief}

請只回傳 JSON：{ "bullets": string[] }，bullets 長度 3～4，每則不超過 80 字，不要其他鍵。
`.trim();
}
