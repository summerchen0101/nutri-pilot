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
import { syncProfileAndGoalsFromWeightKg } from '@/lib/vitals';
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

function isoDateOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function revalidateAfterVitalChange(forDateIso: string) {
  revalidatePath('/log');
  if (forDateIso === todayLocalISODate()) {
    revalidatePath('/dashboard');
  }
}

export async function logWeightForDateAction(
  dateIso: string,
  weightKgRaw: number,
): Promise<{ error?: string }> {
  if (!isoDateOk(dateIso)) return { error: '日期格式無效' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const weightKg = round1(weightKgRaw);
  if (!Number.isFinite(weightKg) || weightKg < 15 || weightKg > 400) {
    return { error: '請輸入合理的體重（15–400 kg）' };
  }

  const { data: existingVital, error: readErr } = await supabase
    .from('vital_logs')
    .select('water_ml, sleep_hours')
    .eq('user_id', user.id)
    .eq('date', dateIso)
    .maybeSingle();

  if (readErr) return { error: readErr.message };

  const { error: vitalErr } = await supabase.from('vital_logs').upsert(
    {
      user_id: user.id,
      date: dateIso,
      weight_kg: weightKg,
      water_ml: existingVital?.water_ml ?? null,
      sleep_hours: existingVital?.sleep_hours ?? null,
    },
    { onConflict: 'user_id,date' },
  );

  if (vitalErr) return { error: vitalErr.message };

  if (dateIso === todayLocalISODate()) {
    const syncRes = await syncProfileAndGoalsFromWeightKg(
      supabase,
      user.id,
      weightKg,
    );
    if (syncRes.error) return { error: syncRes.error };
  }

  revalidateAfterVitalChange(dateIso);
  return {};
}

export async function setWaterMlForDateAction(
  dateIso: string,
  totalMlRaw: number,
): Promise<{ error?: string }> {
  if (!isoDateOk(dateIso)) return { error: '日期格式無效' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const totalMl = Math.round(totalMlRaw);
  if (!Number.isFinite(totalMl) || totalMl < 0 || totalMl > 8000) {
    return { error: '請輸入合理水量（0–8000 ml）' };
  }

  const { data: row, error: readErr } = await supabase
    .from('vital_logs')
    .select('weight_kg, sleep_hours')
    .eq('user_id', user.id)
    .eq('date', dateIso)
    .maybeSingle();

  if (readErr) return { error: readErr.message };

  const { error: upsertErr } = await supabase.from('vital_logs').upsert(
    {
      user_id: user.id,
      date: dateIso,
      weight_kg: row?.weight_kg ?? null,
      water_ml: totalMl,
      sleep_hours: row?.sleep_hours ?? null,
    },
    { onConflict: 'user_id,date' },
  );

  if (upsertErr) return { error: upsertErr.message };

  revalidateAfterVitalChange(dateIso);
  return {};
}

export async function setSleepHoursForDateAction(
  dateIso: string,
  sleepHoursRaw: number,
): Promise<{ error?: string }> {
  if (!isoDateOk(dateIso)) return { error: '日期格式無效' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const sleepHours = round1(sleepHoursRaw);
  if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24) {
    return { error: '請輸入合理睡眠時數（0–24 小時）' };
  }

  const { data: row, error: readErr } = await supabase
    .from('vital_logs')
    .select('weight_kg, water_ml')
    .eq('user_id', user.id)
    .eq('date', dateIso)
    .maybeSingle();

  if (readErr) return { error: readErr.message };

  const { error: upsertErr } = await supabase.from('vital_logs').upsert(
    {
      user_id: user.id,
      date: dateIso,
      weight_kg: row?.weight_kg ?? null,
      water_ml: row?.water_ml ?? null,
      sleep_hours: sleepHours,
    },
    { onConflict: 'user_id,date' },
  );

  if (upsertErr) return { error: upsertErr.message };

  revalidateAfterVitalChange(dateIso);
  return {};
}

/** 身高為全域 profile；與設定頁共用欄位；必要時同步今日 vital 列（保留當日水／睡眠） */
export async function saveHeightCmFromLogAction(
  heightCmRaw: number,
): Promise<{ error?: string }> {
  const heightCm = round1(heightCmRaw);
  if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250) {
    return { error: '請輸入合理的身高（80–250 cm）' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('gender, birth_date, activity_level, weight_kg')
    .eq('user_id', user.id)
    .single();

  if (profileErr || !profile) {
    return { error: profileErr?.message ?? '無法讀取個人資料' };
  }

  const weightKg = round1(Number(profile.weight_kg));
  if (!Number.isFinite(weightKg) || weightKg < 15 || weightKg > 400) {
    return { error: '個人資料體重無效，請先於紀錄頁或設定更新體重' };
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

  const today = todayLocalISODate();
  const { data: todayVital } = await supabase
    .from('vital_logs')
    .select('water_ml, sleep_hours')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();

  const { error: vitalErr } = await supabase.from('vital_logs').upsert(
    {
      user_id: user.id,
      date: today,
      weight_kg: weightKg,
      water_ml: todayVital?.water_ml ?? null,
      sleep_hours: todayVital?.sleep_hours ?? null,
    },
    { onConflict: 'user_id,date' },
  );

  if (vitalErr) return { error: vitalErr.message };

  const profilePatch: TablesUpdate<'user_profiles'> = {
    height_cm: heightCm,
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

  revalidatePath('/log');
  revalidatePath('/dashboard');
  revalidatePath('/settings');
  revalidatePath('/analytics');
  return {};
}
