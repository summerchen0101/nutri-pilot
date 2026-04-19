import type { SupabaseClient } from '@supabase/supabase-js';

import { callClaudeJSON } from '@/lib/ai/claude';
import { FOOD_ESTIMATE_PROMPT } from '@/lib/food/prompts';
import type { Database } from '@/types/supabase';

export type FoodCacheRow = Database['public']['Tables']['food_cache']['Row'];

/** @deprecated 改用 FoodCacheRow（保留舊欄位相容搜尋結果 UI 遷移期） */
export type FoodSearchHit = FoodCacheRow;

export type FoodSearchLayerSource = 'cache' | 'usda' | 'ai_estimate';

export interface FoodSearchResponse {
  results: FoodCacheRow[];
  source: FoodSearchLayerSource;
}

/** USDA /foods/search 單筆（部分欄位） */
interface FdcSearchFood {
  fdcId?: number;
  description?: string;
  brandName?: string;
  brandOwner?: string;
  foodNutrients?: Array<{
    nutrientId?: number;
    unitName?: string;
    value?: number;
  }>;
}

interface FdcSearchResponse {
  foods?: FdcSearchFood[];
}

interface ClaudeFoodEstimateJson {
  name?: string;
  brand?: string | null;
  calories_per_100g?: number;
  carb_g_per_100g?: number;
  protein_g_per_100g?: number;
  fat_g_per_100g?: number;
  fiber_g_per_100g?: number | null;
  sodium_mg_per_100g?: number | null;
}

const N_ENERGY = 1008;
const N_PROT = 1003;
const N_FAT = 1004;
const N_CARB = 1005;
const N_FIBER = 1079;
const N_NA = 1093;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nutPer100gFromFoodNutrients(
  nutrients: FdcSearchFood['foodNutrients'],
): {
  calories_per_100g: number;
  carb_g_per_100g: number;
  protein_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number | null;
  sodium_mg_per_100g: number | null;
} {
  let energyKcal = 0;
  let carb = 0;
  let prot = 0;
  let fat = 0;
  let fiber: number | null = null;
  let sodiumMg: number | null = null;

  for (const raw of nutrients ?? []) {
    const id = Number(raw?.nutrientId ?? 0);
    const value = num(raw?.value);
    const unit = String(raw?.unitName ?? '').toLowerCase();

    switch (id) {
      case N_ENERGY:
        if (unit === 'kj' || unit === 'kilojoule' || unit === 'kilojoules') {
          energyKcal += value / 4.184;
        } else {
          energyKcal += value;
        }
        break;
      case N_CARB:
        carb = value;
        break;
      case N_PROT:
        prot = value;
        break;
      case N_FAT:
        fat = value;
        break;
      case N_FIBER:
        fiber = value;
        break;
      case N_NA:
        sodiumMg = value;
        break;
      default:
        break;
    }
  }

  return {
    calories_per_100g: energyKcal,
    carb_g_per_100g: carb,
    protein_g_per_100g: prot,
    fat_g_per_100g: fat,
    fiber_g_per_100g: fiber,
    sodium_mg_per_100g: sodiumMg,
  };
}

/** 第二層：USDA FoodData Central（搜尋端點） */
export async function searchUSDA(query: string): Promise<FoodCacheRow[]> {
  const q = query.trim();
  const apiKey = process.env.USDA_API_KEY?.trim();
  if (q.length < 2 || !apiKey) return [];

  const params = new URLSearchParams({
    query: q,
    api_key: apiKey,
    pageSize: '5',
  });
  params.append('dataType', 'Branded');
  params.append('dataType', 'Foundation');

  let data: FdcSearchResponse;
  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) return [];
    data = (await res.json()) as FdcSearchResponse;
  } catch {
    return [];
  }

  const foods = data.foods ?? [];
  const out: FoodCacheRow[] = [];

  for (const food of foods) {
    const fdcId = food.fdcId;
    if (fdcId == null) continue;

    let nutrients = nutPer100gFromFoodNutrients(food.foodNutrients);

    if (nutrients.calories_per_100g <= 0) {
      nutrients = await fetchUSDADetailNutrients(fdcId, apiKey);
    }
    if (nutrients.calories_per_100g <= 0) continue;

    const brand =
      (food.brandName && String(food.brandName).trim()) ||
      (food.brandOwner && String(food.brandOwner).trim()) ||
      null;

    const name =
      (food.description && String(food.description).trim()) || '未命名食品';

    const row: FoodCacheRow = {
      id: crypto.randomUUID(),
      off_code: null,
      source: 'usda',
      external_id: String(fdcId),
      name,
      alias: null,
      brand,
      calories_per_100g: nutrients.calories_per_100g,
      carb_g_per_100g: nutrients.carb_g_per_100g,
      protein_g_per_100g: nutrients.protein_g_per_100g,
      fat_g_per_100g: nutrients.fat_g_per_100g,
      fiber_g_per_100g: nutrients.fiber_g_per_100g,
      sodium_mg_per_100g: nutrients.sodium_mg_per_100g,
      is_verified: true,
      updated_at: new Date().toISOString(),
    };

    out.push(row);
  }

  return out;
}

async function fetchUSDADetailNutrients(
  fdcId: number,
  apiKey: string,
): Promise<ReturnType<typeof nutPer100gFromFoodNutrients>> {
  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok)
      return {
        calories_per_100g: 0,
        carb_g_per_100g: 0,
        protein_g_per_100g: 0,
        fat_g_per_100g: 0,
        fiber_g_per_100g: null,
        sodium_mg_per_100g: null,
      };
    const detail = (await res.json()) as FdcSearchFood;
    return nutPer100gFromFoodNutrients(detail.foodNutrients);
  } catch {
    return {
      calories_per_100g: 0,
      carb_g_per_100g: 0,
      protein_g_per_100g: 0,
      fat_g_per_100g: 0,
      fiber_g_per_100g: null,
      sodium_mg_per_100g: null,
    };
  }
}

/** 第三層：Claude JSON 估算（不寫入 food_cache） */
export async function estimateWithClaude(query: string): Promise<FoodCacheRow[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  let parsed: ClaudeFoodEstimateJson;
  try {
    parsed = await callClaudeJSON<ClaudeFoodEstimateJson>(
      FOOD_ESTIMATE_PROMPT(q),
    );
  } catch {
    return [];
  }

  const name =
    (parsed.name && String(parsed.name).trim()) || q;
  const kcal = num(parsed.calories_per_100g);
  if (kcal <= 0) return [];

  const row: FoodCacheRow = {
    id: crypto.randomUUID(),
    off_code: null,
    source: 'ai_estimate',
    external_id: null,
    name,
    alias: null,
    brand: parsed.brand != null ? String(parsed.brand) : null,
    calories_per_100g: kcal,
    carb_g_per_100g: num(parsed.carb_g_per_100g),
    protein_g_per_100g: num(parsed.protein_g_per_100g),
    fat_g_per_100g: num(parsed.fat_g_per_100g),
    fiber_g_per_100g:
      parsed.fiber_g_per_100g != null ? num(parsed.fiber_g_per_100g) : null,
    sodium_mg_per_100g:
      parsed.sodium_mg_per_100g != null
        ? num(parsed.sodium_mg_per_100g)
        : null,
    is_verified: false,
    updated_at: new Date().toISOString(),
  };

  return [row];
}

/** 非同步寫入 USDA 結果至 food_cache（不 await） */
export function cacheUSDAResults(
  supabase: SupabaseClient,
  rows: FoodCacheRow[],
): void {
  const usdaRows = rows.filter((r) => r.source === 'usda' && r.external_id);
  if (!usdaRows.length) return;

  void (async () => {
    for (const r of usdaRows) {
      const ext = r.external_id!;
      const { data: existing } = await supabase
        .from('food_cache')
        .select('id')
        .eq('source', 'usda')
        .eq('external_id', ext)
        .maybeSingle();

      if (existing?.id) continue;

      await supabase.from('food_cache').insert({
        off_code: null,
        source: 'usda',
        external_id: ext,
        name: r.name,
        alias: null,
        brand: r.brand,
        calories_per_100g: r.calories_per_100g,
        carb_g_per_100g: r.carb_g_per_100g,
        protein_g_per_100g: r.protein_g_per_100g,
        fat_g_per_100g: r.fat_g_per_100g,
        fiber_g_per_100g: r.fiber_g_per_100g,
        sodium_mg_per_100g: r.sodium_mg_per_100g,
        is_verified: true,
      });
    }
  })();
}

async function searchLocalCache(
  supabase: SupabaseClient,
  query: string,
): Promise<FoodCacheRow[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data: rpcRows, error: rpcErr } = await supabase.rpc(
    'match_food_cache',
    { p_query: q },
  );

  if (!rpcErr && rpcRows && Array.isArray(rpcRows)) {
    return rpcRows as FoodCacheRow[];
  }

  const { data: nameRows } = await supabase
    .from('food_cache')
    .select('*')
    .ilike('name', `%${q}%`)
    .order('is_verified', { ascending: false })
    .order('name', { ascending: true })
    .limit(50);

  return (nameRows ?? []) as FoodCacheRow[];
}

/**
 * 三層搜尋：本地快取 → USDA → Claude 估算。
 * 應由 Server Action 呼叫（環境變數 USDA_API_KEY / ANTHROPIC_API_KEY）。
 */
export async function searchFoods(
  supabase: SupabaseClient,
  query: string,
): Promise<FoodSearchResponse> {
  const q = query.trim();
  if (q.length < 2) {
    return { results: [], source: 'cache' };
  }

  const cacheHits = await searchLocalCache(supabase, q);
  if (cacheHits.length >= 3) {
    return { results: cacheHits, source: 'cache' };
  }

  const usdaHits = await searchUSDA(q);
  cacheUSDAResults(supabase, usdaHits);

  const merged: FoodCacheRow[] = [];
  const seen = new Set<string>();

  for (const row of [...cacheHits, ...usdaHits]) {
    const key = row.external_id
      ? `usda:${row.external_id}`
      : row.off_code
        ? `off:${row.off_code}`
        : `id:${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  if (merged.length > 0) {
    return {
      results: merged,
      source: usdaHits.length > 0 ? 'usda' : 'cache',
    };
  }

  const aiHits = await estimateWithClaude(q);
  if (aiHits.length > 0) {
    return { results: aiHits, source: 'ai_estimate' };
  }

  return { results: [], source: 'cache' };
}
