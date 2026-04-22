/** 依每日熱量目標推算三大營養素建議克數（50% 碳水、25% 蛋白、25% 脂肪熱量占比）。 */
export function macroTargetsFromKcal(kcal: number): {
  carb: number;
  protein: number;
  fat: number;
} {
  if (!Number.isFinite(kcal) || kcal <= 0) {
    return { carb: 0, protein: 0, fat: 0 };
  }
  return {
    carb: (kcal * 0.5) / 4,
    protein: (kcal * 0.25) / 4,
    fat: (kcal * 0.25) / 9,
  };
}
