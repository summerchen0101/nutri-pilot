'use server';

import { revalidatePath } from 'next/cache';

import {
  calcBMI,
  calcBMR,
  calcDailyCalTarget,
  calcTargetDate,
  calcTDEE,
} from '@/lib/calculations';
import { todayLocalISODate } from '@/lib/onboarding/date';
import { triggerRecalculateScores } from '@/lib/settings/trigger-recalculate-scores';
import { createClient } from '@/lib/supabase/server';
import type { TablesUpdate } from '@/types/supabase';

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dateToISODateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function revalidateMain() {
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/plan');
}

export async function saveProfileName(
  name: string,
): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) {
    return { error: '請輸入有效的姓名（1–80 字）' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { error } = await supabase
    .from('user_profiles')
    .update({
      name: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidateMain();
  return {};
}

export async function saveBodyMetrics(
  heightCmRaw: number,
  weightKgRaw: number,
): Promise<{ error?: string }> {
  const heightCm = round1(heightCmRaw);
  const weightKg = round1(weightKgRaw);

  if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250) {
    return { error: '請輸入合理的身高（80–250 cm）' };
  }
  if (!Number.isFinite(weightKg) || weightKg < 15 || weightKg > 400) {
    return { error: '請輸入合理的體重（15–400 kg）' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('gender, birth_date, activity_level')
    .eq('user_id', user.id)
    .single();

  if (profileErr || !profile) {
    return { error: profileErr?.message ?? '無法讀取個人資料' };
  }

  const bd = profile.birth_date
    ? new Date(`${profile.birth_date}T12:00:00`)
    : null;
  if (!bd || Number.isNaN(bd.getTime())) {
    return { error: '個人資料缺少有效生日，無法重算代謝' };
  }

  const bmi = round1(calcBMI(heightCm, weightKg));
  const bmr = round1(calcBMR(profile.gender, bd, heightCm, weightKg));
  const tdee = round1(calcTDEE(bmr, profile.activity_level));

  const date = todayLocalISODate();

  const { error: vitalErr } = await supabase.from('vital_logs').upsert(
    {
      user_id: user.id,
      date,
      weight_kg: weightKg,
    },
    { onConflict: 'user_id,date' },
  );

  if (vitalErr) return { error: vitalErr.message };

  const profilePatch: TablesUpdate<'user_profiles'> = {
    height_cm: heightCm,
    weight_kg: weightKg,
    bmi,
    bmr,
    tdee,
    updated_at: new Date().toISOString(),
  };

  const { error: updErr } = await supabase
    .from('user_profiles')
    .update(profilePatch)
    .eq('user_id', user.id);

  if (updErr) return { error: updErr.message };

  const { data: goal } = await supabase
    .from('user_goals')
    .select('id, type, weekly_rate_kg, target_weight_kg')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (goal) {
    const weekly =
      goal.type === 'maintain' ? 0 : Number(goal.weekly_rate_kg) || 0;
    const dailyCal = round1(calcDailyCalTarget(tdee, goal.type, weekly));
    let targetDateStr: string | null = null;
    if (goal.type !== 'maintain' && weekly > 0) {
      targetDateStr = dateToISODateOnly(
        calcTargetDate(weightKg, Number(goal.target_weight_kg), weekly),
      );
    }
    const { error: gErr } = await supabase
      .from('user_goals')
      .update({
        daily_cal_target: dailyCal,
        target_date: targetDateStr,
      })
      .eq('id', goal.id);

    if (gErr) return { error: gErr.message };
  }

  revalidateMain();
  revalidatePath('/analytics');
  return {};
}

export async function saveGoals(payload: {
  type: string;
  targetWeightKg: number;
  weeklyRateKg: number;
}): Promise<{ error?: string }> {
  const { type, targetWeightKg, weeklyRateKg } = payload;

  const validTypes = ['lose_weight', 'gain_muscle', 'maintain'];
  if (!validTypes.includes(type)) {
    return { error: '無效的目標類型' };
  }

  if (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0) {
    return { error: '請輸入有效的目標體重' };
  }

  const weekly =
    type === 'maintain' ? 0 : round1(weeklyRateKg);

  if (type !== 'maintain') {
    if (!Number.isFinite(weeklyRateKg) || weekly <= 0) {
      return { error: '請輸入每週合理的體重變化（公斤）' };
    }
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data: profile, error: pErr } = await supabase
    .from('user_profiles')
    .select('weight_kg, gender, birth_date, activity_level, height_cm')
    .eq('user_id', user.id)
    .single();

  if (pErr || !profile) return { error: pErr?.message ?? '無法讀取個人資料' };

  const weightNow = Number(profile.weight_kg);
  if (!Number.isFinite(weightNow) || weightNow <= 0) {
    return { error: '請先在身體數據中填寫體重' };
  }

  const h = Number(profile.height_cm);
  const bd = profile.birth_date
    ? new Date(`${profile.birth_date}T12:00:00`)
    : null;
  if (!bd || Number.isNaN(bd.getTime()) || !Number.isFinite(h) || h <= 0) {
    return { error: '個人資料不完整，無法計算熱量目標' };
  }

  const bmr = round1(calcBMR(profile.gender, bd, h, weightNow));
  const tdee = round1(calcTDEE(bmr, profile.activity_level));
  const dailyCal = round1(calcDailyCalTarget(tdee, type, weekly));

  let targetDateStr: string | null = null;
  if (type !== 'maintain' && weekly > 0) {
    targetDateStr = dateToISODateOnly(
      calcTargetDate(weightNow, targetWeightKg, weekly),
    );
  }

  const { data: goalRow } = await supabase
    .from('user_goals')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!goalRow) return { error: '找不到啟用中的飲控目標' };

  const { error: uErr } = await supabase
    .from('user_goals')
    .update({
      type,
      target_weight_kg: round1(targetWeightKg),
      weekly_rate_kg: weekly,
      daily_cal_target: dailyCal,
      target_date: targetDateStr,
    })
    .eq('id', goalRow.id);

  if (uErr) return { error: uErr.message };

  revalidateMain();
  revalidatePath('/analytics');
  return {};
}

export async function saveDietPreferences(payload: {
  dietType: string;
  mealFrequency: number;
  avoidFoods: string[];
  allergens: string[];
  dietMethod: string;
}): Promise<{ error?: string }> {
  const {
    dietType,
    mealFrequency,
    avoidFoods,
    allergens,
    dietMethod,
  } = payload;

  const dietTypes = ['omnivore', 'vegetarian', 'vegan'];
  if (!dietTypes.includes(dietType)) return { error: '無效的飲食類型' };

  if (
    !Number.isFinite(mealFrequency) ||
    mealFrequency < 2 ||
    mealFrequency > 6
  ) {
    return { error: '每日餐次請選 2–6 餐' };
  }

  const methods = [
    'mediterranean',
    'keto',
    'high_protein',
    'low_cal',
    'intermittent',
    'dash',
    'custom',
  ];
  if (!methods.includes(dietMethod)) return { error: '無效的飲食法' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { error: pErr } = await supabase
    .from('user_profiles')
    .update({
      diet_type: dietType,
      meal_frequency: mealFrequency,
      avoid_foods: avoidFoods.length ? avoidFoods : [],
      allergens: allergens.length ? allergens : [],
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (pErr) return { error: pErr.message };

  const { data: plan } = await supabase
    .from('diet_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!plan) return { error: '找不到啟用中的飲食計畫' };

  const { error: planErr } = await supabase
    .from('diet_plans')
    .update({ diet_method: dietMethod })
    .eq('id', plan.id);

  if (planErr) return { error: planErr.message };

  await triggerRecalculateScores(user.id);

  revalidateMain();
  return {};
}
