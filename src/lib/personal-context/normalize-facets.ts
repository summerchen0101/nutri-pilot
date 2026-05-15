import {
  PERSONAL_CONTEXT_MAX_ITEM_CHARS,
  PERSONAL_CONTEXT_MAX_ITEMS_PER_LIST,
  type PersonalContextFacets,
} from '@/lib/personal-context/types';

function clampStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (!t) continue;
    out.push(t.slice(0, PERSONAL_CONTEXT_MAX_ITEM_CHARS));
    if (out.length >= PERSONAL_CONTEXT_MAX_ITEMS_PER_LIST) break;
  }
  return out;
}

function nullableTrimmed(value: unknown, maxLen: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

/** 由 Claude 或客戶端傳入的粗資料正規化；extracted_at 由呼叫端填入。 */
export function normalizeFacetsFromUnknown(
  raw: unknown,
  extractedAtIso: string,
): PersonalContextFacets | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;

  const o = raw as Record<string, unknown>;

  return {
    conditions: clampStringList(o.conditions),
    family_history: clampStringList(o.family_history),
    current_state: clampStringList(o.current_state),
    diet_preferences_extra: clampStringList(o.diet_preferences_extra),
    medications_supplements: clampStringList(o.medications_supplements),
    other: clampStringList(o.other),
    overlap_note: nullableTrimmed(o.overlap_note, 500),
    summary_zh: nullableTrimmed(o.summary_zh, 800),
    extracted_at: extractedAtIso,
  };
}

/** 是否至少有一則面向內容（不含僅 overlap_note） */
export function personalContextFacetsHasContent(
  f: PersonalContextFacets | null,
): boolean {
  if (!f) return false;
  const lists = [
    ...f.conditions,
    ...f.family_history,
    ...f.current_state,
    ...f.diet_preferences_extra,
    ...f.medications_supplements,
    ...f.other,
  ];
  if (lists.length > 0) return true;
  if (f.summary_zh && f.summary_zh.trim().length > 0) return true;
  return false;
}
