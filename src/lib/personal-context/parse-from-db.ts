import { normalizeFacetsFromUnknown } from '@/lib/personal-context/normalize-facets';
import type { PersonalContextFacets } from '@/lib/personal-context/types';
import type { Json } from '@/types/supabase';

/** 自 DB jsonb 讀出；若格式無效回傳 null。 */
export function parsePersonalContextFacetsFromDb(
  raw: Json | null | undefined,
): PersonalContextFacets | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const extracted =
    typeof (raw as Record<string, unknown>).extracted_at === 'string'
      ? String((raw as Record<string, unknown>).extracted_at)
      : new Date().toISOString();
  return normalizeFacetsFromUnknown(raw, extracted);
}
