import { ACTIVITY_TYPES, type ActivityType } from '@/lib/activity/activity-types';

import type {
  MealType,
  QuickLogActivityProposal,
  QuickLogFoodProposal,
  QuickLogValidatedEntry,
  QuickLogSleepProposal,
  QuickLogWaterProposal,
  QuickLogWeightProposal,
} from '@/lib/quick-log/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isoDateOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function asString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isMealType(s: string): s is MealType {
  return (MEAL_TYPES as readonly string[]).includes(s);
}

function isActivityType(s: string): s is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(s);
}

export type ValidateQuickLogResult =
  | { ok: true; summaryZh: string | null; entries: QuickLogValidatedEntry[] }
  | { ok: false; error: string };

function validateFoodRow(
  row: Record<string, unknown>,
): QuickLogFoodProposal | null {
  const mealRaw = asString(row.mealType ?? row.meal_type);
  const dateRaw = asString(row.date);
  const nameRaw = asString(row.name);
  if (!mealRaw || !isMealType(mealRaw)) return null;
  if (!dateRaw || !isoDateOk(dateRaw)) return null;
  const name = (nameRaw ?? '').trim();
  if (name.length < 1) return null;

  const quantity_g = asFiniteNumber(row.quantity_g);
  if (quantity_g == null || quantity_g <= 0) return null;

  const calories = asFiniteNumber(row.calories);
  const carb_g = asFiniteNumber(row.carb_g);
  const protein_g = asFiniteNumber(row.protein_g);
  const fat_g = asFiniteNumber(row.fat_g);
  if (
    calories == null ||
    carb_g == null ||
    protein_g == null ||
    fat_g == null
  ) {
    return null;
  }

  let fiber_g: number | null = null;
  if (row.fiber_g !== undefined && row.fiber_g !== null) {
    const f = asFiniteNumber(row.fiber_g);
    if (f == null || f < 0) return null;
    fiber_g = Math.round(f);
  }

  let sodium_mg: number | null = null;
  if (row.sodium_mg !== undefined && row.sodium_mg !== null) {
    const s = asFiniteNumber(row.sodium_mg);
    if (s == null || s < 0) return null;
    sodium_mg = Math.round(s);
  }

  return {
    kind: 'food' as const,
    mealType: mealRaw,
    date: dateRaw,
    name,
    quantity_g,
    calories: Math.round(calories),
    carb_g: Math.round(carb_g),
    protein_g: Math.round(protein_g),
    fat_g: Math.round(fat_g),
    fiber_g,
    sodium_mg,
  };
}

function validateActivityRow(
  row: Record<string, unknown>,
): QuickLogActivityProposal | null {
  const loggedDate =
    asString(row.loggedDate ?? row.logged_date ?? row.date) ?? '';
  if (!isoDateOk(loggedDate)) return null;

  const atRaw =
    asString(row.activityType ?? row.activity_type) ?? '';
  if (!isActivityType(atRaw)) return null;

  const durationMinutes = Math.round(Number(row.durationMinutes ?? row.duration_minutes));
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    return null;
  }

  let caloriesEst: number | null = null;
  const ceRaw = row.caloriesEst ?? row.calories_est;
  if (ceRaw !== undefined && ceRaw !== null) {
    const ce = asFiniteNumber(ceRaw);
    if (ce == null || ce < 0) return null;
    caloriesEst = ce;
  }

  let notes: string | null = null;
  const nRaw = asString(row.notes);
  if (nRaw && nRaw.trim()) {
    notes = nRaw.trim().slice(0, 500);
  }

  return {
    kind: 'activity',
    loggedDate,
    activityType: atRaw,
    durationMinutes,
    caloriesEst,
    notes,
  };
}

function validateWeightRow(row: Record<string, unknown>): QuickLogWeightProposal | null {
  const dateIso =
    asString(row.dateIso ?? row.date_iso ?? row.date) ?? '';
  if (!isoDateOk(dateIso)) return null;

  const w = asFiniteNumber(row.weightKg ?? row.weight_kg);
  if (w == null) return null;
  const round1 = Math.round(w * 10) / 10;
  if (!Number.isFinite(round1) || round1 < 15 || round1 > 400) return null;

  return { kind: 'weight', dateIso, weightKg: round1 };
}

function validateWaterRow(row: Record<string, unknown>): QuickLogWaterProposal | null {
  const dateIso =
    asString(row.dateIso ?? row.date_iso ?? row.date) ?? '';
  if (!isoDateOk(dateIso)) return null;

  const totalMl = Math.round(Number(row.waterMlTotal ?? row.water_ml_total ?? row.water_ml));
  if (!Number.isFinite(totalMl) || totalMl < 0 || totalMl > 8000) return null;

  return { kind: 'water', dateIso, waterMlTotal: totalMl };
}

function validateSleepRow(row: Record<string, unknown>): QuickLogSleepProposal | null {
  const dateIso =
    asString(row.dateIso ?? row.date_iso ?? row.date) ?? '';
  if (!isoDateOk(dateIso)) return null;

  const h = asFiniteNumber(row.sleepHours ?? row.sleep_hours);
  if (h == null) return null;
  const round1 = Math.round(h * 10) / 10;
  if (!Number.isFinite(round1) || round1 < 0 || round1 > 24) return null;

  return { kind: 'sleep', dateIso, sleepHours: round1 };
}

export function validateQuickLogEntry(
  raw: unknown,
): QuickLogValidatedEntry | null {
  if (!isRecord(raw)) return null;

  const kind = asString(raw.kind);
  if (!kind) return null;

  switch (kind) {
    case 'food':
      return validateFoodRow(raw);
    case 'activity':
      return validateActivityRow(raw);
    case 'weight':
      return validateWeightRow(raw);
    case 'water':
      return validateWaterRow(raw);
    case 'sleep':
      return validateSleepRow(raw);
    default:
      return null;
  }
}

const ENTRY_KIND_LABEL: Record<string, string> = {
  food: '飲食',
  activity: '運動',
  weight: '體重',
  water: '飲水',
  sleep: '睡眠',
};

export function validateQuickLogEntriesList(
  entries: QuickLogValidatedEntry[],
  summaryZh: string | null,
): ValidateQuickLogResult {
  if (entries.length < 1) {
    return { ok: false, error: '至少需保留一筆紀錄' };
  }

  const validated: QuickLogValidatedEntry[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const row = validateQuickLogEntry(entries[i]);
    if (!row) {
      const kind = isRecord(entries[i]) ? asString(entries[i].kind) : null;
      const label =
        kind && ENTRY_KIND_LABEL[kind] ? ENTRY_KIND_LABEL[kind] : '紀錄';
      return {
        ok: false,
        error: `第 ${i + 1} 筆（${label}）欄位不正確，請檢查日期、數值與必填項目`,
      };
    }
    validated.push(row);
  }

  return { ok: true, summaryZh, entries: validated };
}

export function validateQuickLogClaudePayload(
  raw: unknown,
): ValidateQuickLogResult {
  if (!isRecord(raw)) {
    return { ok: false, error: 'AI 回傳格式不是物件' };
  }

  const summaryRaw = raw.summary_zh ?? raw.summaryZh;
  const summaryZh =
    typeof summaryRaw === 'string' && summaryRaw.trim()
      ? summaryRaw.trim().slice(0, 500)
      : null;

  const entriesRaw = raw.entries;
  if (!Array.isArray(entriesRaw)) {
    return { ok: false, error: '缺少 entries 陣列' };
  }

  const entries: QuickLogValidatedEntry[] = [];
  let firstInvalidIdx: number | null = null;

  for (let i = 0; i < entriesRaw.length; i += 1) {
    const validated = validateQuickLogEntry(entriesRaw[i]);
    if (!validated) {
      firstInvalidIdx = firstInvalidIdx ?? i + 1;
      continue;
    }
    entries.push(validated);
  }

  if (entries.length === 0) {
    if (firstInvalidIdx == null) {
      return { ok: true, summaryZh, entries: [] };
    }
    return {
      ok: false,
      error: `沒有可寫入的紀錄。（第 ${firstInvalidIdx} 筆起無法解析為有效紀錄）`,
    };
  }

  if (firstInvalidIdx != null) {
    return {
      ok: false,
      error:
        `部分項目格式不正確（從第 ${firstInvalidIdx} 筆起略過）；請換句話說或拆成多次輸入。`,
    };
  }

  return { ok: true, summaryZh, entries };
}
