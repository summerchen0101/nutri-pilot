import type { PersonalContextFacets } from '@/lib/personal-context/types';

function escapeJsonForPrompt(obj: unknown): string {
  return JSON.stringify(obj ?? null).replace(/`/g, '\\`');
}

/**
 * 從口述稿與（可選）既有面向合併整理；模型須輸出固定鍵，不含 extracted_at。
 */
export function buildPersonalContextExtractPrompt(input: {
  userText: string;
  existingFacets: PersonalContextFacets | null;
  /** 已在 App 填寫的過敏原／忌食 slug 或標籤，供模型避免重複堆砌 */
  allergens: string[];
  avoidFoods: string[];
}): string {
  const safeText = input.userText.replace(/`/g, "'").trim();
  const existingBlock =
    input.existingFacets ?
      `目前 App 已儲存之面向（請與下列新輸入合併、去重、更新過時內容；若新輸入未提及的面向可保留）：\n${escapeJsonForPrompt({
        conditions: input.existingFacets.conditions,
        family_history: input.existingFacets.family_history,
        current_state: input.existingFacets.current_state,
        diet_preferences_extra: input.existingFacets.diet_preferences_extra,
        medications_supplements: input.existingFacets.medications_supplements,
        other: input.existingFacets.other,
        overlap_note: input.existingFacets.overlap_note,
        summary_zh: input.existingFacets.summary_zh,
      })}\n`
    : '目前 App 尚無已儲存之個人化面向。\n';

  const allergenLine =
    input.allergens.length > 0 ?
      input.allergens.join('、')
    : '（未填）';
  const avoidLine =
    input.avoidFoods.length > 0 ?
      input.avoidFoods.join('、')
    : '（未填）';

  return `
你是 Nutri Pilot 的資料整理助理。使用者以繁體中文口述飲食與健康相關背景（可能雜訊多、條列不清）。請抽出**固定面向**，供 App 與其他 AI 任務參考。**這不是醫療診斷**，僅整理使用者自述。

${existingBlock}
使用者已在 App 正式欄位填寫（請勿在面向裡重複抄寫相同過敏原／忌食；若口述內容與此高度重疊，寫在 overlap_note 提醒使用者以正式欄位為準）：
- 過敏原：${allergenLine}
- 忌食關鍵字：${avoidLine}

口述內容：
"""${safeText}"""

規則：
1. 僅依口述內容與既有面向整理；不要臆造病史。
2. 每個面向為短句陣列，每句一行概念、20 字內為佳，最多 12 句／面向。
3. overlap_note：若口述與「正式欄位」重複，簡短說明（無則 null）。
4. summary_zh：2～4 句繁中，給使用者快速確認（可 null）。
5. 鍵名必須完全一致（snake_case）：conditions, family_history, current_state, diet_preferences_extra, medications_supplements, other, overlap_note, summary_zh。不得輸出 extracted_at。

回傳單一 JSON 物件（不要 markdown）。
`.trim();
}
