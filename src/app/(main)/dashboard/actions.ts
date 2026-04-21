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

export async function logWeightAction(
  weightKgRaw: number,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const weightKg = round1(weightKgRaw);
  if (!Number.isFinite(weightKg) || weightKg < 15 || weightKg > 400) {
    return { error: '請輸入合理的體重（15–400 kg）' };
  }

  const date = todayLocalISODate();

  const { data: existingVital } = await supabase
    .from('vital_logs')
    .select('water_ml')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();

  const { error: vitalErr } = await supabase.from('vital_logs').upsert(
    {
      user_id: user.id,
      date,
      weight_kg: weightKg,
      water_ml: existingVital?.water_ml ?? null,
    },
    { onConflict: 'user_id,date' },
  );

  if (vitalErr) {
    return { error: vitalErr.message };
  }

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('gender, birth_date, activity_level, height_cm')
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

  const heightCm = Number(profile.height_cm);
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    return { error: '個人資料缺少有效身高' };
  }

  const bmi = round1(calcBMI(heightCm, weightKg));
  const bmr = round1(calcBMR(profile.gender, bd, heightCm, weightKg));
  const tdee = round1(calcTDEE(bmr, profile.activity_level));

  const profilePatch: TablesUpdate<'user_profiles'> = {
    weight_kg: weightKg,
    bmi,
    bmr,
    tdee,
    updated_at: new Date().toISOString(),
  };

  const { error: updProfileErr } = await supabase
    .from('user_profiles')
    .update(profilePatch)
    .eq('user_id', user.id);

  if (updProfileErr) {
    return { error: updProfileErr.message };
  }

  const { data: goal } = await supabase
    .from('user_goals')
    .select('id, type, weekly_rate_kg, target_weight_kg')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (goal) {
    const weekly =
      goal.type === 'maintain' ? 0 : Number(goal.weekly_rate_kg) || 0;
    const dailyCal = round1(
      calcDailyCalTarget(tdee, goal.type, weekly),
    );
    let targetDateStr: string | null = null;
    if (goal.type !== 'maintain' && weekly > 0) {
      targetDateStr = dateToISODateOnly(
        calcTargetDate(
          weightKg,
          Number(goal.target_weight_kg),
          weekly,
        ),
      );
    }
    const { error: goalErr } = await supabase
      .from('user_goals')
      .update({
        daily_cal_target: dailyCal,
        target_date: targetDateStr,
      })
      .eq('id', goal.id);

    if (goalErr) {
      return { error: goalErr.message };
    }
  }

  revalidatePath('/dashboard');
  return {};
}

export async function setWaterMlForTodayAction(
  totalMlRaw: number,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const totalMl = Math.round(totalMlRaw);
  if (!Number.isFinite(totalMl) || totalMl < 0 || totalMl > 8000) {
    return { error: '請輸入合理水量（0–8000 ml）' };
  }

  const date = todayLocalISODate();

  const { data: row, error: readErr } = await supabase
    .from('vital_logs')
    .select('weight_kg')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();

  if (readErr) {
    return { error: readErr.message };
  }

  const { error: upsertErr } = await supabase.from('vital_logs').upsert(
    {
      user_id: user.id,
      date,
      weight_kg: row?.weight_kg ?? null,
      water_ml: totalMl,
    },
    { onConflict: 'user_id,date' },
  );

  if (upsertErr) {
    return { error: upsertErr.message };
  }

  revalidatePath('/dashboard');
  return {};
}
