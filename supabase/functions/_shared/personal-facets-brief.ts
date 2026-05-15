/**
 * 與 `src/lib/personal-context/facets-to-prompt-brief.ts` 邏輯對齊（Edge 無法 import App）。
 * 輸入為 DB `personal_context_facets` jsonb。
 */

const MAX_TOTAL_CHARS = 1200;
const MAX_ITEMS = 12;
const MAX_ITEM_LEN = 240;

function clampStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t) continue;
    out.push(t.slice(0, MAX_ITEM_LEN));
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function nullableStr(v: unknown, max: number): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export function personalFacetsJsonToPromptBrief(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw !== "object" || Array.isArray(raw)) return "";

  const o = raw as Record<string, unknown>;
  const conditions = clampStringList(o.conditions);
  const family_history = clampStringList(o.family_history);
  const current_state = clampStringList(o.current_state);
  const diet_preferences_extra = clampStringList(o.diet_preferences_extra);
  const medications_supplements = clampStringList(o.medications_supplements);
  const other = clampStringList(o.other);
  const overlap_note = nullableStr(o.overlap_note, 500);
  const summary_zh = nullableStr(o.summary_zh, 800);

  const hasLists =
    conditions.length +
      family_history.length +
      current_state.length +
      diet_preferences_extra.length +
      medications_supplements.length +
      other.length >
    0;
  if (!hasLists && !summary_zh) return "";

  const lines: string[] = [
    "【使用者個人化脈絡（自述整理，非醫療診斷；僅供語氣與留意點參考）】",
  ];

  function append(title: string, items: string[]) {
    if (!items.length) return;
    lines.push(`${title}：`);
    for (const it of items) lines.push(`- ${it}`);
  }

  append("疾病／慢性狀況（自述）", conditions);
  append("家族史／遺傳相關留意", family_history);
  append("當前身體狀況或階段", current_state);
  append("飲食偏好補充（口語）", diet_preferences_extra);
  append("用藥或保健品留意（非指導）", medications_supplements);
  append("其他", other);

  if (overlap_note) {
    lines.push(`與 App 內已填過敏／忌食欄位重疊提醒：${overlap_note}`);
  }
  if (summary_zh) {
    lines.push(`摘要：${summary_zh}`);
  }

  const text = lines.join("\n").trim();
  return text.length > MAX_TOTAL_CHARS ?
      `${text.slice(0, MAX_TOTAL_CHARS)}…`
    : text;
}
