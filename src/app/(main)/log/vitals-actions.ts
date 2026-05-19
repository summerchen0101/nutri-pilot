'use server';

import { revalidatePath } from 'next/cache';

import { logDateMutationError } from '@/lib/log/log-date-policy';
import { todayLocalISODate } from '@/lib/onboarding/date';
import { syncProfileAndGoalsFromWeightKg } from '@/lib/vitals';
import { createClient } from '@/lib/supabase/server';

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function isoDateOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function revalidateAfterVitalChange(forDateIso: string) {
  revalidatePath('/log');
  revalidatePath('/log/history');
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

  const dateErr = logDateMutationError(dateIso);
  if (dateErr) return { error: dateErr };

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

  const dateErr = logDateMutationError(dateIso);
  if (dateErr) return { error: dateErr };

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
