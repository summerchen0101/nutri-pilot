import type { SupabaseClient } from '@supabase/supabase-js';

import {
  calcBMI,
  calcBMR,
  calcDailyCalTarget,
  calcTargetDate,
  calcTDEE,
} from '@/lib/calculations';
import type { Database, TablesUpdate } from '@/types/supabase';

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dateToISODateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 將體重寫入 profile 並重算 BMI／BMR／TDEE 與啟用中目標熱量（儀表板記錄今日體重、補登體重為「今日」時使用） */
export async function syncProfileAndGoalsFromWeightKg(
  supabase: SupabaseClient<Database>,
  userId: string,
  weightKg: number,
): Promise<{ error?: string }> {
  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('gender, birth_date, activity_level, height_cm')
    .eq('user_id', userId)
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
    .eq('user_id', userId);

  if (updProfileErr) {
    return { error: updProfileErr.message };
  }

  const { data: goal } = await supabase
    .from('user_goals')
    .select('id, type, weekly_rate_kg, target_weight_kg')
    .eq('user_id', userId)
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

  return {};
}
