import type { PersonalContextFacets } from '@/lib/personal-context/types';

const MAX_TOTAL_CHARS = 1200;

const LABELS: Record<
  keyof Pick<
    PersonalContextFacets,
    | 'conditions'
    | 'family_history'
    | 'current_state'
    | 'diet_preferences_extra'
    | 'medications_supplements'
    | 'other'
  >,
  string
> = {
  conditions: '疾病／慢性狀況（自述）',
  family_history: '家族史／遺傳相關留意',
  current_state: '當前身體狀況或階段',
  diet_preferences_extra: '飲食偏好補充（口語）',
  medications_supplements: '用藥或保健品留意（非指導）',
  other: '其他',
};

function appendSection(
  lines: string[],
  title: string,
  items: string[],
): void {
  if (!items.length) return;
  lines.push(`${title}：`);
  for (const it of items) {
    lines.push(`- ${it}`);
  }
}

/**
 * 將面向壓成給其他 AI 任務的短附段（有硬上限）。
 */
export function personalFacetsToPromptBrief(
  facets: PersonalContextFacets | null,
): string {
  if (!facets) return '';

  const lines: string[] = [
    '【使用者個人化脈絡（自述整理，非醫療診斷；僅供語氣與留意點參考）】',
  ];

  appendSection(lines, LABELS.conditions, facets.conditions);
  appendSection(lines, LABELS.family_history, facets.family_history);
  appendSection(lines, LABELS.current_state, facets.current_state);
  appendSection(
    lines,
    LABELS.diet_preferences_extra,
    facets.diet_preferences_extra,
  );
  appendSection(
    lines,
    LABELS.medications_supplements,
    facets.medications_supplements,
  );
  appendSection(lines, LABELS.other, facets.other);

  if (facets.overlap_note) {
    lines.push(`與 App 內已填過敏／忌食欄位重疊提醒：${facets.overlap_note}`);
  }
  if (facets.summary_zh) {
    lines.push(`摘要：${facets.summary_zh}`);
  }

  const text = lines.join('\n').trim();
  return text.length > MAX_TOTAL_CHARS ?
      `${text.slice(0, MAX_TOTAL_CHARS)}…`
    : text;
}
