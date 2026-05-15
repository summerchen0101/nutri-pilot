/**
 * 將紀錄依日期彙總（飲食、運動、生活指標）；供 Dashboard AI、Analytics 等共用。
 */

export type FoodNutritionByDateMap = Record<
  string,
  { kcal: number; carbG: number; proteinG: number; fatG: number }
>;

export function aggregateFoodLogsByDate(
  rows: {
    date: string;
    food_log_items:
      | {
          calories: number;
          carb_g: number;
          protein_g: number;
          fat_g: number;
        }[]
      | null;
  }[],
): FoodNutritionByDateMap {
  const map: FoodNutritionByDateMap = {};

  for (const row of rows) {
    const d = row.date;
    if (!map[d]) {
      map[d] = { kcal: 0, carbG: 0, proteinG: 0, fatG: 0 };
    }
    for (const it of row.food_log_items ?? []) {
      map[d].kcal += Number(it.calories) || 0;
      map[d].carbG += Number(it.carb_g) || 0;
      map[d].proteinG += Number(it.protein_g) || 0;
      map[d].fatG += Number(it.fat_g) || 0;
    }
  }

  return map;
}

export type ActivityByDateMap = Record<string, { minutes: number; kcalEst: number }>;

export type ActivityEventRow = {
  logged_date: string;
  activity_type: string;
  duration_minutes: number;
};

export function aggregateActivityLogsByDate(
  rows: {
    logged_date: string;
    activity_type: string;
    duration_minutes: number;
    calories_est: number | null;
  }[],
): {
  activityByDate: ActivityByDateMap;
  activityEvents: ActivityEventRow[];
} {
  const activityByDate: ActivityByDateMap = {};
  const activityEvents: ActivityEventRow[] = [];

  for (const row of rows) {
    const d = row.logged_date;
    if (!activityByDate[d]) {
      activityByDate[d] = { minutes: 0, kcalEst: 0 };
    }
    const min = Number(row.duration_minutes) || 0;
    activityByDate[d].minutes += min;
    if (
      row.calories_est != null &&
      Number.isFinite(Number(row.calories_est))
    ) {
      activityByDate[d].kcalEst += Number(row.calories_est);
    }
    activityEvents.push({
      logged_date: d,
      activity_type: row.activity_type,
      duration_minutes: min,
    });
  }

  return { activityByDate, activityEvents };
}

/** 同一天多筆 vital 時：飲水量加總；睡眠／體重取迭代中最後一個非 null。 */
export type VitalDayRollup = {
  totalWaterMl: number;
  sleepHours: number | null;
  weightKg: number | null;
};

export function aggregateVitalLogsByDate(
  rows: {
    date: string;
    water_ml: number | null;
    sleep_hours: number | null;
    weight_kg: number | null;
  }[],
): Record<string, VitalDayRollup> {
  const map: Record<string, VitalDayRollup> = {};

  for (const row of rows) {
    const d = row.date;
    if (!map[d]) {
      map[d] = { totalWaterMl: 0, sleepHours: null, weightKg: null };
    }
    const bucket = map[d];
    const w = row.water_ml;
    if (w != null && Number.isFinite(Number(w))) {
      bucket.totalWaterMl += Math.max(0, Math.round(Number(w)));
    }
    if (row.sleep_hours != null && Number.isFinite(Number(row.sleep_hours))) {
      bucket.sleepHours = Number(row.sleep_hours);
    }
    if (row.weight_kg != null && Number.isFinite(Number(row.weight_kg))) {
      bucket.weightKg = Number(row.weight_kg);
    }
  }

  return map;
}
