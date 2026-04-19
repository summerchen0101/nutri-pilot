/** @see docs/05-shop.md */

export interface FitReason {
  type: 'positive' | 'info' | 'caution';
  text: string;
}

export interface FitReasonProduct {
  diet_tags: string[] | null;
  ingredients?: string | null;
  allergen_free: string[] | null;
  calories: number;
  protein_g: number;
  sugar_g?: number | null;
}

export interface FitReasonProfile {
  avoid_foods: string[];
  allergens: string[];
}

export interface FitReasonGoal {
  type: 'lose_weight' | 'gain_muscle' | 'maintain';
}

export interface FitReasonPlan {
  diet_method: string;
}

const DIET_LABELS: Record<string, string> = {
  mediterranean: '地中海飲食',
  keto: '生酮飲食',
  high_protein: '高蛋白飲食',
  low_cal: '低熱量飲食',
  intermittent: '間歇性斷食',
  dash: 'DASH 飲食',
  custom: '自訂計畫',
};

const ALLERGEN_LABELS: Record<string, string> = {
  shellfish: '甲殼類',
  peanuts: '花生',
  gluten: '麩質',
  dairy: '乳製品',
  eggs: '蛋',
  soy: '大豆',
  tree_nuts: '堅果類',
};

export function generateFitReasons(
  product: FitReasonProduct,
  profile: FitReasonProfile,
  goal: FitReasonGoal,
  plan: FitReasonPlan | null,
): FitReason[] {
  const reasons: FitReason[] = [];
  const dietMethod = plan?.diet_method ?? '';
  const tags = product.diet_tags ?? [];

  if (dietMethod && tags.includes(dietMethod)) {
    const label = DIET_LABELS[dietMethod] ?? dietMethod;
    reasons.push({
      type: 'positive',
      text: `符合你的${label}`,
    });
  }

  if (profile.avoid_foods.length > 0) {
    const ingredientSafe = !profile.avoid_foods.some((food) =>
      product.ingredients?.includes(food),
    );
    if (ingredientSafe) {
      reasons.push({
        type: 'positive',
        text: `不含你設定的忌食成分（${profile.avoid_foods.join('、')}）`,
      });
    }
  }

  if (profile.allergens.length > 0) {
    const free = product.allergen_free ?? [];
    const allCovered = profile.allergens.every((a) => free.includes(a));
    if (allCovered) {
      reasons.push({
        type: 'positive',
        text: `標示不含你的過敏原（${profile.allergens.map((a) => ALLERGEN_LABELS[a] ?? a).join('、')}）`,
      });
    }
  }

  if (goal.type === 'gain_muscle' && product.protein_g > 15) {
    reasons.push({
      type: 'positive',
      text: `每份含 ${product.protein_g}g 蛋白質，支持你的增肌目標`,
    });
  }
  if (goal.type === 'lose_weight' && product.calories < 150) {
    reasons.push({
      type: 'positive',
      text: `低熱量（${product.calories} kcal／份），適合控制總攝取量`,
    });
  }

  reasons.push({
    type: 'info',
    text: '適合作為兩餐之間的補給，維持與長期飲食計畫一致的選擇',
  });

  return reasons.slice(0, 4);
}
