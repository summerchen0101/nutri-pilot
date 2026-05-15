/** 設定頁身體數據 BMI／BMR／TDEE 底部說明文案（對齊 calculations.ts） */
export type BodyMetricsInfoSheetKind = 'bmi' | 'bmr' | 'tdee';

export const BODY_METRICS_INFO_SHEETS: Record<
  BodyMetricsInfoSheetKind,
  { title: string; paragraphs: readonly string[] }
> = {
  bmi: {
    title: '認識 BMI',
    paragraphs: [
      'BMI（身體質量指數）＝體重（公斤）÷ 身高（公尺）的平方，用來粗略評估體型與體重在身高下的相對關係。',
      '本頁「BMI 判讀」（偏輕／健康／過重／肥胖等）為一般常見區間分段，僅供自我了解與紀錄參考，不構成醫療診斷或治療建議。',
    ],
  },
  bmr: {
    title: '認識 BMR',
    paragraphs: [
      'BMR（基礎代謝率）估算身體在靜息狀態下，維持呼吸、循環等基本生理機能所需熱量（大卡／日）。',
      '本 App 採「Mifflin–St Jeor」方程式計算（與 Onboarding／更新身高體重時之邏輯一致），並使用您的性別、生日、身高與目前體重等資料。',
      '計算結果受個別狀態與推算假設影響，數值僅供參考。',
    ],
  },
  tdee: {
    title: '認識 TDEE',
    paragraphs: [
      'TDEE（每日總熱量消耗）為將 BMR 乘以「活動係數」得出的估算值，代表在一般日常活動量底下的熱量需求（大卡／日）。係數對應您在檔案中選擇的活動程度（久坐、輕度、中度、高度、極高等）。',
      '設定頁顯示的 TDEE 優先為目前已儲存於個人檔案的數值；若尚無紀錄，畫面上可能會以簡化的備援方式估算，以利瀏覽，與實際後端寫入的 TDEE 可能略有差異，仍以參考為主。',
    ],
  },
};
