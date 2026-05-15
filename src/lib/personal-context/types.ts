/**
 * 與 DB `user_profiles.personal_context_facets`、Claude 抽取 JSON 鍵名一致（snake_case）。
 */
export type PersonalContextFacets = {
  conditions: string[];
  family_history: string[];
  current_state: string[];
  diet_preferences_extra: string[];
  medications_supplements: string[];
  other: string[];
  overlap_note: string | null;
  summary_zh: string | null;
  /** 寫入 DB 時由伺服端設定（ISO） */
  extracted_at: string;
};

export const PERSONAL_CONTEXT_INPUT_MAX_CHARS = 3500;

export const PERSONAL_CONTEXT_MAX_ITEMS_PER_LIST = 12;

export const PERSONAL_CONTEXT_MAX_ITEM_CHARS = 240;
