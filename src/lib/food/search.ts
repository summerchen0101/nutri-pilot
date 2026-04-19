import type { SupabaseClient } from '@supabase/supabase-js';

/** 與 UI / 寫入共用（非 DB Row）。 */
export interface FoodSearchHit {
  cacheId?: string;
  offCode: string | null;
  name: string;
  brand: string | null;
  calories_per_100g: number;
  carb_g_per_100g: number;
  protein_g_per_100g: number;
  fat_g_per_100g: number;
}

/** Open Food Facts nutriments → kcal／100g */
function kcalPer100g(nut: Record<string, unknown>): number {
  const kcalDirect = Number(nut['energy-kcal_100g']);
  if (Number.isFinite(kcalDirect) && kcalDirect > 0) return kcalDirect;

  const kj =
    Number(nut['energy_100g']) ||
    Number(nut['energy-kj_100g']) ||
    Number(nut['energy']);
  if (Number.isFinite(kj) && kj > 0) return kj / 4.184;

  return 0;
}

function mapOffProduct(p: Record<string, unknown>): FoodSearchHit | null {
  const nut = (p.nutriments ?? {}) as Record<string, unknown>;
  const kcal = kcalPer100g(nut);
  if (!kcal || kcal <= 0) return null;

  const name =
    (p.product_name as string) ||
    (p.product_name_zh as string) ||
    (p.generic_name as string) ||
    '未命名食品';

  return {
    offCode: (p.code as string) || null,
    name,
    brand: (p.brands as string) || null,
    calories_per_100g: kcal,
    carb_g_per_100g: Number(nut.carbohydrates_100g ?? 0) || 0,
    protein_g_per_100g: Number(nut.proteins_100g ?? 0) || 0,
    fat_g_per_100g: Number(nut.fat_100g ?? 0) || 0,
  };
}

/**
 * 先查 `food_cache`，再查 Open Food Facts；合併去重（偏離 docs/06-pages「只回快取」—見 docs/changes）。
 * @see docs/06-pages.md
 */
export async function searchFoods(
  supabase: SupabaseClient,
  query: string,
): Promise<FoodSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data: cachedRows } = await supabase
    .from('food_cache')
    .select('*')
    .ilike('name', `%${q}%`)
    .limit(8);

  const fromCache: FoodSearchHit[] = (cachedRows ?? []).map((row) => ({
    cacheId: row.id as string,
    offCode: (row.off_code as string | null) ?? null,
    name: row.name as string,
    brand: (row.brand as string | null) ?? null,
    calories_per_100g: Number(row.calories_per_100g),
    carb_g_per_100g: Number(row.carb_g_per_100g),
    protein_g_per_100g: Number(row.protein_g_per_100g),
    fat_g_per_100g: Number(row.fat_g_per_100g),
  }));

  const offHeaders = {
    Accept: 'application/json',
    // OFF 要求可識別的 User-Agent，否則常回空陣列或 403
    'User-Agent': 'NutriGuard/2 (https://github.com/; log search)',
  };

  async function fetchOffHits(
    extraParams: Record<string, string>,
  ): Promise<FoodSearchHit[]> {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?` +
      new URLSearchParams({
        search_terms: q,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: '12',
        ...extraParams,
      });
    const res = await fetch(url.toString(), { headers: offHeaders });
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: Record<string, unknown>[] };
    const products = data.products ?? [];
    return products
      .map((p) => mapOffProduct(p))
      .filter((x): x is FoodSearchHit => x !== null);
  }

  let offHits: FoodSearchHit[] = [];
  try {
    offHits = await fetchOffHits({ lc: 'zh', cc: 'tw' });
    if (offHits.length === 0) {
      offHits = await fetchOffHits({});
    }

    for (const hit of offHits.slice(0, 10)) {
      if (!hit.offCode) continue;
      await supabase.from('food_cache').upsert(
        {
          off_code: hit.offCode,
          name: hit.name,
          brand: hit.brand,
          calories_per_100g: hit.calories_per_100g,
          carb_g_per_100g: hit.carb_g_per_100g,
          protein_g_per_100g: hit.protein_g_per_100g,
          fat_g_per_100g: hit.fat_g_per_100g,
        },
        { onConflict: 'off_code' },
      );
    }
  } catch {
    /* OFF 失敗時仍返回快取 */
  }

  const seen = new Set<string>();
  const merged: FoodSearchHit[] = [];

  for (const h of [...fromCache, ...offHits]) {
    const key = `${h.offCode ?? 'x'}:${h.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(h);
    if (merged.length >= 15) break;
  }

  return merged;
}
