import { activityTypeLabelZh } from '@/lib/activity/activity-type-labels';
import type {
  ActivityByDateMap,
  ActivityEventRow,
  FoodNutritionByDateMap,
  VitalDayRollup,
} from '@/lib/log';
import { iterateISODatesInclusive } from '@/lib/onboarding/date';
import {
  ACTIVITY_OPTIONS,
  ALLERGEN_OPTIONS,
  DIET_METHOD_OPTIONS,
  DIET_TYPE_OPTIONS,
  GOAL_TYPE_OPTIONS,
} from '@/lib/onboarding/constants';
import { personalFacetsToPromptBrief } from '@/lib/personal-context/facets-to-prompt-brief';
import type { PersonalContextFacets } from '@/lib/personal-context/types';

export type DashboardInsightProfileInput = {
  diet_method: string | null;
  diet_type: string;
  allergens: string[] | null;
  avoid_foods: string[] | null;
  meal_frequency: number;
  activity_level: string;
  tracks_glycemic_concern: boolean;
  facets: PersonalContextFacets | null;
};

export type DashboardInsightBodyMetricsInput = {
  height_cm: number;
  weight_kg: number;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
};

export type DashboardInsightActiveGoalInput = {
  type: string;
  target_weight_kg: number;
  weekly_rate_kg: number;
  daily_cal_target: number;
  target_date: string | null;
} | null;

function labelFromOptions(
  value: string,
  options: readonly { value: string; label: string }[],
): string {
  const hit = options.find((o) => o.value === value);
  return hit?.label ?? value;
}

function formatAllergenCodes(codes: string[] | null): string {
  if (!codes?.length) return '';
  return codes
    .map((c) => labelFromOptions(c, ALLERGEN_OPTIONS))
    .filter(Boolean)
    .join('、');
}

const MAX_DIET_CONTEXT_CHARS = 1200;
const MAX_HEALTH_GOALS_CHARS = 900;

function clampPromptSection(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}

/** 近 7 日區間內是否至少有一項飲食／運動／生活指標紀錄。 */
export function hasRollingLogDataInWeek(input: {
  weekStart: string;
  today: string;
  nutritionByDate: FoodNutritionByDateMap;
  activityByDate: ActivityByDateMap;
  vitalByDate: Record<string, VitalDayRollup>;
}): boolean {
  const dates = iterateISODatesInclusive(input.weekStart, input.today);
  for (const d of dates) {
    const n = input.nutritionByDate[d];
    if (n && n.kcal > 0) return true;
    const a = input.activityByDate[d];
    if (a && a.minutes > 0) return true;
    const v = input.vitalByDate[d];
    if (v) {
      if (v.totalWaterMl > 0) return true;
      if (v.sleepHours != null) return true;
      if (v.weightKg != null) return true;
    }
  }
  return false;
}

/** 對應設定「飲食與脈絡」：飲食偏好 + 口述脈絡（facets）。 */
export function buildDashboardDietContextBrief(
  profile: DashboardInsightProfileInput,
): string {
  const lines: string[] = ['【飲食與脈絡（設定）】'];

  const dietMethodLabel = profile.diet_method
    ? labelFromOptions(profile.diet_method, DIET_METHOD_OPTIONS)
    : '';
  if (dietMethodLabel) {
    lines.push(`飲食方式：${dietMethodLabel}`);
  }

  lines.push(
    `飲食型態：${labelFromOptions(profile.diet_type, DIET_TYPE_OPTIONS)}`,
  );
  lines.push(`每日餐次（設定）：${profile.meal_frequency}`);
  lines.push(
    `活動量等級（影響 TDEE 試算）：${labelFromOptions(profile.activity_level, ACTIVITY_OPTIONS)}`,
  );

  const allergensLine = formatAllergenCodes(profile.allergens);
  lines.push(
    allergensLine ? `忌食／過敏（設定）：${allergensLine}` : '忌食／過敏（設定）：無額外標示',
  );

  const avoid = profile.avoid_foods?.filter(Boolean) ?? [];
  if (avoid.length) lines.push(`口語忌食清單：${avoid.join('、')}`);

  lines.push(
    `糖量／血糖相關提醒偏好（標示守衛）：${profile.tracks_glycemic_concern ? '已開啟' : '未開啟'}`,
  );

  const prefs = lines.join('\n');
  const facetsBrief = profile.facets
    ? personalFacetsToPromptBrief(profile.facets).trim()
    : '';

  const combined =
    facetsBrief ? `${prefs}\n\n${facetsBrief}` : prefs;

  return clampPromptSection(combined, MAX_DIET_CONTEXT_CHARS);
}

/** 對應設定「健康與目標」：身體指標 + 作用中飲控目標。 */
export function buildDashboardHealthGoalsBrief(input: {
  body: DashboardInsightBodyMetricsInput;
  goal: DashboardInsightActiveGoalInput;
}): string {
  const lines: string[] = ['【健康與目標（設定）】'];

  const h = Number(input.body.height_cm);
  const w = Number(input.body.weight_kg);
  lines.push(
    Number.isFinite(h) && h > 0 ?
      `身高（檔案）：${Math.round(h)} cm`
    : '身高（檔案）：—',
  );
  lines.push(
    Number.isFinite(w) && w > 0 ?
      `目前體重（檔案）：${Number(w.toFixed(1))} kg`
    : '目前體重（檔案）：—',
  );
  const bmi = input.body.bmi;
  lines.push(
    bmi != null && Number.isFinite(Number(bmi)) ?
      `BMI（檔案試算）：${Number(Number(bmi).toFixed(1))}`
    : 'BMI（檔案試算）：—',
  );
  const bmr = input.body.bmr;
  lines.push(
    bmr != null && Number.isFinite(Number(bmr)) ?
      `BMR（檔案）：約 ${Math.round(Number(bmr))} kcal／日`
    : 'BMR（檔案）：—',
  );
  const tdee = input.body.tdee;
  lines.push(
    tdee != null && Number.isFinite(Number(tdee)) ?
      `TDEE（檔案）：約 ${Math.round(Number(tdee))} kcal／日`
    : 'TDEE（檔案）：—',
  );

  const g = input.goal;
  if (g) {
    lines.push('');
    lines.push('【飲控目標（作用中）】');
    lines.push(`目標類型：${labelFromOptions(g.type, GOAL_TYPE_OPTIONS)}`);
    lines.push(`目標體重：${Number(Number(g.target_weight_kg).toFixed(1))} kg`);
    const weekly =
      g.type === 'maintain' ? 0 : Number(Number(g.weekly_rate_kg).toFixed(2));
    lines.push(
      g.type === 'maintain' ?
        '每週速率：維持（0 kg／週）'
      : `每週速率：${weekly} kg／週`,
    );
    lines.push(
      `每日熱量目標（系統試算）：${Math.round(Number(g.daily_cal_target))} kcal／日`,
    );
    lines.push(
      g.target_date && String(g.target_date).trim().length > 0 ?
        `預計達標日：${String(g.target_date).slice(0, 10)}`
      : '預計達標日：—（維持或尚未試算日期）',
    );
  } else {
    lines.push('');
    lines.push('【飲控目標】目前無作用中目標列或未讀取。');
  }

  return clampPromptSection(lines.join('\n'), MAX_HEALTH_GOALS_CHARS);
}

function shortDate(dateIso: string): string {
  return dateIso.slice(5).replace(/^0/, '');
}

export function buildSevenDayRollingBrief(input: {
  weekStart: string;
  today: string;
  dailyCalTarget: number | null;
  nutritionByDate: FoodNutritionByDateMap;
  activityByDate: ActivityByDateMap;
  vitalByDate: Record<string, VitalDayRollup>;
  activityEventsInWindow: ActivityEventRow[];
}): string {
  const dates = iterateISODatesInclusive(input.weekStart, input.today);
  const foodLines: string[] = ['【近 7 日飲食（依日加總，單位 kcal／g）】'];
  for (const d of dates) {
    const n = input.nutritionByDate[d];
    const kcal = n ? Math.round(n.kcal) : 0;
    if (!n || kcal <= 0) {
      foodLines.push(`${shortDate(d)}：無紀錄`);
      continue;
    }
    foodLines.push(
      `${shortDate(d)}：熱量約 ${kcal}，碳水${Math.round(n.carbG)}／蛋白${Math.round(n.proteinG)}／脂肪${Math.round(n.fatG)}`,
    );
  }

  if (input.dailyCalTarget != null && input.dailyCalTarget > 0) {
    foodLines.push(
      `使用者目前熱量目標約：${Math.round(input.dailyCalTarget)} kcal／日`,
    );
  }

  const actLines: string[] = ['【近 7 日運動（依日）】'];
  for (const d of dates) {
    const a = input.activityByDate[d];
    if (!a || a.minutes <= 0) {
      actLines.push(`${shortDate(d)}：無紀錄`);
      continue;
    }
    const kcalEst =
      a.kcalEst > 0 ?
        `，估消耗約 ${Math.round(a.kcalEst)} kcal`
      : '';
    actLines.push(`${shortDate(d)}：運動約 ${Math.round(a.minutes)} 分鐘${kcalEst}`);
  }

  const typeCounts = new Map<string, number>();
  for (const ev of input.activityEventsInWindow) {
    const k = ev.activity_type.trim() || 'other';
    typeCounts.set(k, (typeCounts.get(k) ?? 0) + 1);
  }
  const typeSummary =
    typeCounts.size > 0 ?
      Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${activityTypeLabelZh(t)}×${n}`)
        .join('、')
    : '無';

  actLines.push(`本週運動類型次數概覽：${typeSummary}`);

  const vitLines: string[] = ['【近 7 日生活指標（vital，有則列出）】'];
  for (const d of dates) {
    const v = input.vitalByDate[d];
    if (
      !v ||
      (v.totalWaterMl <= 0 &&
        v.sleepHours == null &&
        v.weightKg == null)
    ) {
      vitLines.push(`${shortDate(d)}：無紀錄`);
      continue;
    }
    const parts: string[] = [];
    if (v.totalWaterMl > 0) parts.push(`飲水約 ${v.totalWaterMl} ml`);
    if (v.sleepHours != null) parts.push(`睡眠約 ${v.sleepHours} 小時`);
    if (v.weightKg != null) parts.push(`體重約 ${v.weightKg} kg`);
    vitLines.push(`${shortDate(d)}：${parts.join('，')}`);
  }

  return [foodLines.join('\n'), actLines.join('\n'), vitLines.join('\n')].join(
    '\n\n',
  );
}
