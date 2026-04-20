import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type FoodCacheRow = Database['public']['Tables']['food_cache']['Row'];

/**
 * 供手動輸入 AI 分析 API 參考：先用 food_cache 同名／相似列辅助 prompt。
 */
export async function fetchFoodCacheHintsForManualInput(
  supabase: SupabaseClient,
  rawInput: string,
): Promise<FoodCacheRow[]> {
  const q = rawInput.trim();
  if (q.length < 1) return [];

  const { data: exactRows } = await supabase
    .from('food_cache')
    .select('*')
    .ilike('name', q)
    .limit(5);

  if (exactRows?.length) {
    return exactRows as FoodCacheRow[];
  }

  const { data: rpcRows, error: rpcErr } = await supabase.rpc(
    'match_food_cache',
    { p_query: q },
  );

  if (!rpcErr && rpcRows && Array.isArray(rpcRows)) {
    return (rpcRows as FoodCacheRow[]).slice(0, 5);
  }

  const { data: nameRows } = await supabase
    .from('food_cache')
    .select('*')
    .ilike('name', `%${q}%`)
    .order('is_verified', { ascending: false })
    .order('name', { ascending: true })
    .limit(5);

  return (nameRows ?? []) as FoodCacheRow[];
}
