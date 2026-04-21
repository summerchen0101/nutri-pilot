import type { Json } from '@/types/supabase';

export const TW_ALLERGEN_CATEGORY_KEYS = [
  'mango',
  'peanut',
  'egg',
  'milk',
  'nuts',
  'sesame',
  'gluten_cereals',
  'soybean',
  'fish',
  'shellfish',
  'crustacean',
  'celery',
  'mustard',
  'sulfite',
] as const;

export type TwAllergenCategoryKey = (typeof TW_ALLERGEN_CATEGORY_KEYS)[number];

export const TW_ALLERGEN_LABEL_ZH: Record<TwAllergenCategoryKey, string> = {
  mango: '芒果',
  peanut: '花生',
  egg: '蛋',
  milk: '牛乳／乳製品',
  nuts: '堅果類',
  sesame: '芝麻',
  gluten_cereals: '含麩質之穀物',
  soybean: '大豆',
  fish: '魚類',
  shellfish: '軟體類／貝類',
  crustacean: '甲殼類',
  celery: '芹菜',
  mustard: '芥末',
  sulfite: '亞硫酸鹽／二氧化硫',
};

export type RiskTier = 'high' | 'medium' | 'watch' | 'low';

export type AudienceSegment =
  | 'child'
  | 'elderly'
  | 'pregnant_lactation'
  | 'allergy'
  | 'general_adult';

export type LabelGuardRiskItem = {
  name: string;
  tier: RiskTier;
  plain_language: string;
};

export type LabelGuardAudienceAdvice = {
  segment: AudienceSegment;
  summary: string;
};

export type LabelGuardAllergenRow = {
  category_key: TwAllergenCategoryKey;
  detected: boolean;
  detail: string | null;
};

export type LabelGuardReport = {
  _kind: 'label_guard_report';
  safety_score: number;
  alert_keywords: string[];
  risk_items: LabelGuardRiskItem[];
  audience_advice: LabelGuardAudienceAdvice[];
  allergens_tw14: LabelGuardAllergenRow[];
  summary_note: string | null;
  disclaimer_required: boolean;
};

const AUDIENCE_LABEL_ZH: Record<AudienceSegment, string> = {
  child: '兒童',
  elderly: '年長者',
  pregnant_lactation: '孕婦／哺乳',
  allergy: '過敏體質',
  general_adult: '一般成人',
};

export function audienceSegmentLabelZh(s: AudienceSegment): string {
  return AUDIENCE_LABEL_ZH[s] ?? s;
}

/** 低於 75 為警示（琥珀橘）；其餘為主綠（與 UI 規範一致）。 */
export function safetyScoreTextClass(score: number): string {
  return score < 75 ? 'text-[#EF9F27]' : 'text-[#4C956C]';
}

function asRiskTier(v: unknown): RiskTier {
  if (v === 'high' || v === 'medium' || v === 'watch' || v === 'low') return v;
  return 'watch';
}

function asAudienceSegment(v: unknown): AudienceSegment | null {
  if (
    v === 'child' ||
    v === 'elderly' ||
    v === 'pregnant_lactation' ||
    v === 'allergy' ||
    v === 'general_adult'
  ) {
    return v;
  }
  return null;
}

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  if (Number.isNaN(v)) return 70;
  return Math.max(0, Math.min(100, v));
}

export function parseLabelGuardReportJson(
  json: Json | null,
): LabelGuardReport | null {
  if (json == null || typeof json !== 'object' || Array.isArray(json)) {
    return null;
  }
  const o = json as Record<string, unknown>;
  if (o._kind !== 'label_guard_report') return null;

  const alert_keywords: string[] = [];
  const rawKw = o.alert_keywords;
  if (Array.isArray(rawKw)) {
    for (const x of rawKw) {
      const s = String(x ?? '').trim();
      if (s) alert_keywords.push(s.slice(0, 80));
    }
  }

  const risk_items: LabelGuardRiskItem[] = [];
  if (Array.isArray(o.risk_items)) {
    for (const row of o.risk_items) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const name = String(r.name ?? '').trim();
      if (!name) continue;
      risk_items.push({
        name: name.slice(0, 120),
        tier: asRiskTier(r.tier),
        plain_language: String(r.plain_language ?? '')
          .trim()
          .slice(0, 400),
      });
    }
  }

  const audience_advice: LabelGuardAudienceAdvice[] = [];
  if (Array.isArray(o.audience_advice)) {
    for (const row of o.audience_advice) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const seg = asAudienceSegment(r.segment);
      if (!seg) continue;
      const summary = String(r.summary ?? '').trim().slice(0, 400);
      if (!summary) continue;
      audience_advice.push({ segment: seg, summary });
    }
  }

  const byKey = new Map<TwAllergenCategoryKey, LabelGuardAllergenRow>();
  if (Array.isArray(o.allergens_tw14)) {
    for (const row of o.allergens_tw14) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const key = String(r.category_key ?? '').trim() as TwAllergenCategoryKey;
      if (!TW_ALLERGEN_CATEGORY_KEYS.includes(key)) continue;
      byKey.set(key, {
        category_key: key,
        detected: r.detected === true,
        detail:
          r.detail === null || r.detail === undefined
            ? null
            : String(r.detail).trim().slice(0, 200) || null,
      });
    }
  }

  const allergens_tw14: LabelGuardAllergenRow[] = [];
  for (const k of TW_ALLERGEN_CATEGORY_KEYS) {
    allergens_tw14.push(
      byKey.get(k) ?? { category_key: k, detected: false, detail: null },
    );
  }

  return {
    _kind: 'label_guard_report',
    safety_score: clampScore(o.safety_score),
    alert_keywords,
    risk_items,
    audience_advice,
    allergens_tw14,
    summary_note:
      o.summary_note === null || o.summary_note === undefined
        ? null
        : String(o.summary_note).trim().slice(0, 500) || null,
    disclaimer_required: true,
  };
}

export function tierLabelZh(tier: RiskTier): string {
  switch (tier) {
    case 'high':
      return '高風險';
    case 'medium':
      return '中風險';
    case 'watch':
      return '需注意';
    case 'low':
      return '低風險';
    default:
      return tier;
  }
}
