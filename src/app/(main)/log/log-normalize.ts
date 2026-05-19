import type { LogItemSnapshot } from '@/app/(main)/log/log-food-snapshot';

export function normalizeLogItems(
  raw:
    | {
        id: string;
        name: string;
        quantity_g: number;
        calories: number;
        carb_g: number;
        protein_g: number;
        fat_g: number;
        fiber_g: number | null;
        sodium_mg: number | null;
        brand: string | null;
        is_verified: boolean | null;
      }[]
    | null,
): LogItemSnapshot[] | null {
  if (!raw?.length) return [];
  return raw.map((it) => ({
    id: it.id,
    name: it.name,
    quantity_g: Number(it.quantity_g),
    calories: Number(it.calories),
    carb_g: Number(it.carb_g),
    protein_g: Number(it.protein_g),
    fat_g: Number(it.fat_g),
    fiber_g: it.fiber_g == null ? null : Number(it.fiber_g),
    sodium_mg: it.sodium_mg == null ? null : Number(it.sodium_mg),
    brand: it.brand,
    is_verified: it.is_verified,
  }));
}
