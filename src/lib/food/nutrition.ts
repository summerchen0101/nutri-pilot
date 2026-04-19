export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 依每 100g 營養與實際份量換算。 */
export function scaleFromPer100g(
  per100: {
    calories: number;
    carb: number;
    protein: number;
    fat: number;
  },
  quantityG: number,
): { calories: number; carb_g: number; protein_g: number; fat_g: number } {
  const f = quantityG / 100;
  return {
    calories: round1(per100.calories * f),
    carb_g: round1(per100.carb * f),
    protein_g: round1(per100.protein * f),
    fat_g: round1(per100.fat * f),
  };
}
