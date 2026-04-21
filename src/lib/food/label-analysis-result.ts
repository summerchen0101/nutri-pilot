import type { Json } from '@/types/supabase';

export type LabelAdditive = {
  code: string | null;
  name: string;
  note: string;
  concern_level: 'low' | 'medium' | 'high';
};

export type LabelAudienceFlags = {
  not_suitable_infant: boolean;
  child_caution: boolean;
  elderly_caution: boolean;
  high_sugar_concern: boolean;
};

export type LabelAnalysisResult = {
  _kind: 'label_analysis';
  product_name_guess: string | null;
  ingredients_detected: string[];
  additives: LabelAdditive[];
  audience_flags: LabelAudienceFlags;
  allergen_match: { match: boolean; detail: string | null };
  age_advisory_text: string | null;
  summary_bullets: string[];
  disclaimer_required: boolean;
};

function asBool(v: unknown): boolean {
  return v === true;
}

function asConcern(
  v: unknown,
): 'low' | 'medium' | 'high' {
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  return 'medium';
}

export function parseLabelAnalysisJson(json: Json | null): LabelAnalysisResult | null {
  if (json == null || typeof json !== 'object' || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  if (o._kind !== 'label_analysis') return null;

  const bulletsRaw = o.summary_bullets;
  const bullets: string[] = [];
  if (Array.isArray(bulletsRaw)) {
    for (const b of bulletsRaw) {
      const s = String(b ?? '').trim();
      if (s) bullets.push(s.slice(0, 500));
    }
  }

  const ingredientsRaw = o.ingredients_detected;
  const ingredients: string[] = [];
  if (Array.isArray(ingredientsRaw)) {
    for (const x of ingredientsRaw) {
      const s = String(x ?? '').trim();
      if (s) ingredients.push(s.slice(0, 200));
    }
  }

  const additives: LabelAdditive[] = [];
  if (Array.isArray(o.additives)) {
    for (const row of o.additives) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const name = String(r.name ?? '').trim();
      if (!name) continue;
      additives.push({
        code:
          r.code === null || r.code === undefined
            ? null
            : String(r.code).trim().slice(0, 32) || null,
        name: name.slice(0, 120),
        note: String(r.note ?? '').trim().slice(0, 300),
        concern_level: asConcern(r.concern_level),
      });
    }
  }

  const af = o.audience_flags;
  const audience_flags: LabelAudienceFlags =
    af && typeof af === 'object' && !Array.isArray(af)
      ? {
          not_suitable_infant: asBool(
            (af as Record<string, unknown>).not_suitable_infant,
          ),
          child_caution: asBool((af as Record<string, unknown>).child_caution),
          elderly_caution: asBool(
            (af as Record<string, unknown>).elderly_caution,
          ),
          high_sugar_concern: asBool(
            (af as Record<string, unknown>).high_sugar_concern,
          ),
        }
      : {
          not_suitable_infant: false,
          child_caution: false,
          elderly_caution: false,
          high_sugar_concern: false,
        };

  const am = o.allergen_match;
  let allergen_match = { match: false, detail: null as string | null };
  if (am && typeof am === 'object' && !Array.isArray(am)) {
    const a = am as Record<string, unknown>;
    allergen_match = {
      match: asBool(a.match),
      detail:
        a.detail === null || a.detail === undefined
          ? null
          : String(a.detail).trim().slice(0, 400) || null,
    };
  }

  return {
    _kind: 'label_analysis',
    product_name_guess:
      o.product_name_guess === null || o.product_name_guess === undefined
        ? null
        : String(o.product_name_guess).trim().slice(0, 200) || null,
    ingredients_detected: ingredients,
    additives,
    audience_flags,
    allergen_match,
    age_advisory_text:
      o.age_advisory_text === null || o.age_advisory_text === undefined
        ? null
        : String(o.age_advisory_text).trim().slice(0, 400) || null,
    summary_bullets: bullets,
    disclaimer_required: true,
  };
}
