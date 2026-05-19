import {
  aggregateActivityLogsByDate,
  aggregateFoodLogsByDate,
  aggregateVitalLogsByDate,
} from '@/lib/log/aggregate-by-date';
import {
  getLogDateMode,
  type LogDateMode,
} from '@/lib/log/log-date-policy';

const MEAL_LABEL: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

export type LogHistoryDayRow = {
  date: string;
  mode: LogDateMode;
  kcalTotal: number;
  foodEntryCount: number;
  mealsWithLogs: string[];
  activityMinutes: number;
  activityCount: number;
  weightKg: number | null;
  hasWaterOrSleep: boolean;
};

type FoodRow = {
  date: string;
  meal_type: string;
  food_log_items:
    | {
        calories: number;
        carb_g: number;
        protein_g: number;
        fat_g: number;
      }[]
    | null;
};

type ActivityRow = {
  logged_date: string;
  activity_type: string;
  duration_minutes: number;
  calories_est: number | null;
};

type VitalRow = {
  date: string;
  weight_kg: number | null;
  water_ml: number | null;
  sleep_hours: number | null;
};

export function buildLogHistoryDayRows(input: {
  foodRows: FoodRow[];
  activityRows: ActivityRow[];
  vitalRows: VitalRow[];
  todayIso: string;
}): LogHistoryDayRow[] {
  const nutritionByDate = aggregateFoodLogsByDate(input.foodRows);
  const { activityByDate } = aggregateActivityLogsByDate(input.activityRows);
  const vitalByDate = aggregateVitalLogsByDate(input.vitalRows);

  const mealsByDate = new Map<string, Set<string>>();
  let foodEntryCountByDate: Record<string, number> = {};

  for (const row of input.foodRows) {
    const d = row.date;
    if (!mealsByDate.has(d)) mealsByDate.set(d, new Set());
    const mealKey = row.meal_type in MEAL_LABEL ? row.meal_type : 'snack';
    mealsByDate.get(d)?.add(mealKey);
    const itemCount = row.food_log_items?.length ?? 0;
    foodEntryCountByDate[d] = (foodEntryCountByDate[d] ?? 0) + itemCount;
  }

  const activityCountByDate: Record<string, number> = {};
  for (const row of input.activityRows) {
    activityCountByDate[row.logged_date] =
      (activityCountByDate[row.logged_date] ?? 0) + 1;
  }

  const dateSet = new Set<string>();
  for (const d of Object.keys(nutritionByDate)) dateSet.add(d);
  for (const d of Object.keys(activityByDate)) dateSet.add(d);
  for (const d of Object.keys(vitalByDate)) dateSet.add(d);

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  return Array.from(dateSet)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((date) => {
      const vital = vitalByDate[date];
      const hasWater =
        vital != null && vital.totalWaterMl > 0;
      const hasSleep =
        vital?.sleepHours != null && Number.isFinite(vital.sleepHours);
      const mealKeys = mealsByDate.get(date);
      const mealsWithLogs = mealOrder
        .filter((m) => mealKeys?.has(m))
        .map((m) => MEAL_LABEL[m]);

      return {
        date,
        mode: getLogDateMode(date, input.todayIso),
        kcalTotal: Math.round(nutritionByDate[date]?.kcal ?? 0),
        foodEntryCount: foodEntryCountByDate[date] ?? 0,
        mealsWithLogs,
        activityMinutes: Math.round(activityByDate[date]?.minutes ?? 0),
        activityCount: activityCountByDate[date] ?? 0,
        weightKg: vital?.weightKg ?? null,
        hasWaterOrSleep: hasWater || hasSleep,
      };
    });
}
