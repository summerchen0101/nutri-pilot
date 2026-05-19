/** 首頁日期列：昨日未達「三餐完整」時隨機顯示的激勵小語 */
export const DASHBOARD_STREAK_ZERO_MESSAGES = [
  '今天也一起好好記錄吧',
  '每一步紀錄，都是靠近目標的一步',
  '不用完美，持續就好',
  '記下這一餐，明天的你會感謝今天',
  '小進步也是進步，從一餐開始',
] as const;

export function pickRandomStreakZeroMessage(): string {
  const index = Math.floor(Math.random() * DASHBOARD_STREAK_ZERO_MESSAGES.length);
  return DASHBOARD_STREAK_ZERO_MESSAGES[index] ?? DASHBOARD_STREAK_ZERO_MESSAGES[0];
}
