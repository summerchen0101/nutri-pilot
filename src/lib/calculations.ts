/** @see docs/03-features.md — BMI / BMR / TDEE */
/** @see docs/05-shop.md — calcRecommendScore */

export interface RecommendProduct {
  id: string;
  diet_tags: string[];
  allergen_free: string[];
  ingredients?: string | null;
  calories: number;
  sugar_g?: number | null;
  protein_g: number;
  avg_rating: number;
}

export interface RecommendUserProfile {
  allergens: string[];
  avoid_foods: string[];
  diet_method?: string | null;
}

export interface RecommendUserGoal {
  type: 'lose_weight' | 'gain_muscle' | 'maintain';
}

export function calcBMI(heightCm: number, weightKg: number): number {
  const h = heightCm / 100;
  if (h <= 0) return 0;
  return weightKg / (h * h);
}

function ageFromBirthDate(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return Math.max(0, age);
}

/** Mifflin–St Jeor（docs/03-features.md） */
export function calcBMR(
  gender: string,
  birthDate: Date,
  heightCm: number,
  weightKg: number,
): number {
  const age = ageFromBirthDate(birthDate);
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'female') return base - 161;
  return base + 5;
}

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calcTDEE(bmr: number, activityLevel: string): number {
  const factor = ACTIVITY_FACTORS[activityLevel] ?? ACTIVITY_FACTORS.moderate;
  return bmr * factor;
}

export function calcDailyCalTarget(
  tdee: number,
  goalType: string,
  weeklyRateKg: number,
): number {
  const delta = (weeklyRateKg * 7700) / 7;
  if (goalType === 'lose_weight') return tdee - delta;
  if (goalType === 'gain_muscle') return tdee + delta;
  return tdee;
}

/** 預計達標日（docs/03-features.md）：相差公斤 ÷ weeklyRate × 7 天 */
export function calcTargetDate(
  currentWeight: number,
  targetWeight: number,
  weeklyRate: number,
): Date {
  const diffKg = Math.abs(currentWeight - targetWeight);
  if (weeklyRate <= 0 || diffKg === 0) return new Date();

  const weeks = diffKg / weeklyRate;
  const ms = weeks * 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

/** @see docs/05-shop.md */
export function calcRecommendScore(
  product: RecommendProduct,
  profile: RecommendUserProfile,
  goal: RecommendUserGoal,
  purchaseHistory: string[],
): number {
  let score = 0;

  const hasAllergenConflict = profile.allergens.some(
    (allergen) => !product.allergen_free.includes(allergen),
  );
  if (hasAllergenConflict) return -999;

  const method = profile.diet_method ?? '';
  if (method && product.diet_tags.includes(method)) {
    score += 40;
  }

  const ingredientSafe = !profile.avoid_foods.some(
    (food) => product.ingredients?.includes(food) ?? false,
  );
  if (ingredientSafe) score += 20;

  if (goal.type === 'lose_weight' && product.calories < 200) score += 10;
  if (goal.type === 'lose_weight' && (product.sugar_g ?? 0) < 5) score += 5;
  if (goal.type === 'gain_muscle' && product.protein_g > 15) score += 15;

  if (purchaseHistory.includes(product.id)) score += 15;

  score += (product.avg_rating / 5) * 10;

  return score;
}
