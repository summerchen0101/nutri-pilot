import type { ManualFoodAnalysisResult } from '@/lib/food/manual-food-analysis-result';
import type { Json } from '@/types/supabase';

/** 拍照 job 回傳（物件或陣列）→ 與手動 AI 相同結構；UI 只使用第一筆。 */
export function parsePhotoJobResult(
  json: Json | null,
): ManualFoodAnalysisResult | null {
  if (json == null) return null;
  const rows: unknown[] = Array.isArray(json) ? json : [json];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    if (!name) continue;
    const quantity_g = Math.round(Number(o.quantity_g ?? 0));
    const qd = String(o.quantity_description ?? '').trim();
    const fiberRaw = o.fiber_g;
    const sodiumRaw = o.sodium_mg;
    return {
      name,
      quantity_g: quantity_g > 0 ? quantity_g : 100,
      quantity_description: qd || (quantity_g > 0 ? `${quantity_g}g` : '1份'),
      calories: Math.round(Number(o.calories ?? 0)),
      protein_g: Math.round(Number(o.protein_g ?? 0)),
      carb_g: Math.round(Number(o.carb_g ?? 0)),
      fat_g: Math.round(Number(o.fat_g ?? 0)),
      fiber_g:
        fiberRaw === null || fiberRaw === undefined || fiberRaw === ''
          ? null
          : Math.round(Number(fiberRaw)),
      sodium_mg:
        sodiumRaw === null || sodiumRaw === undefined || sodiumRaw === ''
          ? null
          : Math.round(Number(sodiumRaw)),
    };
  }
  return null;
}
