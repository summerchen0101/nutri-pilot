'use server';

import { revalidatePath } from 'next/cache';

import {
  calcBMI,
  calcBMR,
  calcDailyCalTarget,
  calcTargetDate,
  calcTDEE,
} from '@/lib/calculations';
import { triggerRecalculateScores } from '@/lib/settings/trigger-recalculate-scores';
import { createClient } from '@/lib/supabase/server';
import type { Tables, TablesUpdate } from '@/types/supabase';

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
  revalidatePath('/settings/points');
  revalidatePath('/settings/membership');
  revalidatePath('/dashboard');
  revalidatePath('/log');
  revalidatePath('/shop');
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

/** 僅更新身高；體重以 `user_profiles`／紀錄頁為準，不寫入 `vital_logs`。 */
export async function saveHeightCm(
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
    return {
      error: '請先在「紀錄」頁的體重卡填寫體重後，再調整身高',
    };
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
    return { error: '請先在「紀錄」頁填寫體重' };
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

const MAX_SHIPPING_FIELD = 500;

const MAX_SHIPPING_ADDRESSES = 10;

async function syncProfileShippingFromDefault(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const { data: row } = await supabase
    .from('user_shipping_addresses')
    .select('recipient_name, phone, address_full')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  const patch: TablesUpdate<'user_profiles'> = {
    updated_at: new Date().toISOString(),
  };

  if (!row) {
    patch.shipping_recipient_name = null;
    patch.shipping_phone = null;
    patch.shipping_address_full = null;
  } else {
    patch.shipping_recipient_name = row.recipient_name;
    patch.shipping_phone = row.phone;
    patch.shipping_address_full = row.address_full;
  }

  await supabase.from('user_profiles').update(patch).eq('user_id', userId);
}

export async function saveShippingProfile(payload: {
  recipientName: string;
  phone: string;
  addressFull: string;
}): Promise<{ error?: string }> {
  const recipientName = payload.recipientName.trim();
  const phone = payload.phone.trim();
  const addressFull = payload.addressFull.trim();
  if (!recipientName || recipientName.length > 120) {
    return { error: '請填寫收件人姓名（1–120 字）' };
  }
  if (!phone || phone.length > 40) {
    return { error: '請填寫有效聯絡電話' };
  }
  if (!addressFull || addressFull.length > MAX_SHIPPING_FIELD) {
    return { error: `請填寫完整地址（1–${MAX_SHIPPING_FIELD} 字）` };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data: def } = await supabase
    .from('user_shipping_addresses')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  const now = new Date().toISOString();
  const basePatch = {
    recipient_name: recipientName,
    phone,
    address_full: addressFull,
    updated_at: now,
  };

  if (def?.id) {
    const { error } = await supabase
      .from('user_shipping_addresses')
      .update(basePatch)
      .eq('id', def.id)
      .eq('user_id', user.id);
    if (error) return { error: error.message };
  } else {
    const { error: clearErr } = await supabase
      .from('user_shipping_addresses')
      .update({ is_default: false, updated_at: now })
      .eq('user_id', user.id);
    if (clearErr) return { error: clearErr.message };

    const { error: insErr } = await supabase.from('user_shipping_addresses').insert({
      user_id: user.id,
      ...basePatch,
      is_default: true,
      sort_order: 0,
    });
    if (insErr) return { error: insErr.message };
  }

  await syncProfileShippingFromDefault(supabase, user.id);
  revalidateMain();
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
      diet_method: dietMethod,
      avoid_foods: avoidFoods.length ? avoidFoods : [],
      allergens: allergens.length ? allergens : [],
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (pErr) return { error: pErr.message };

  await triggerRecalculateScores(user.id);

  revalidateMain();
  return {};
}

export async function listUserShippingAddresses(): Promise<{
  rows?: Tables<'user_shipping_addresses'>[];
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data, error } = await supabase
    .from('user_shipping_addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };
  return { rows: data ?? [] };
}

export async function createUserShippingAddress(payload: {
  recipientName: string;
  phone: string;
  addressFull: string;
  asDefault?: boolean;
}): Promise<{ error?: string }> {
  const recipientName = payload.recipientName.trim();
  const phone = payload.phone.trim();
  const addressFull = payload.addressFull.trim();
  if (!recipientName || recipientName.length > 120) {
    return { error: '請填寫收件人姓名（1–120 字）' };
  }
  if (!phone || phone.length > 40) {
    return { error: '請填寫有效聯絡電話' };
  }
  if (!addressFull || addressFull.length > MAX_SHIPPING_FIELD) {
    return { error: `請填寫完整地址（1–${MAX_SHIPPING_FIELD} 字）` };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { count, error: cErr } = await supabase
    .from('user_shipping_addresses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (cErr) return { error: cErr.message };
  const n = count ?? 0;
  if (n >= MAX_SHIPPING_ADDRESSES) {
    return { error: `最多儲存 ${MAX_SHIPPING_ADDRESSES} 筆收件地址` };
  }

  const makeDefault = payload.asDefault === true || n === 0;

  if (makeDefault) {
    const { error: uErr } = await supabase
      .from('user_shipping_addresses')
      .update({ is_default: false })
      .eq('user_id', user.id);
    if (uErr) return { error: uErr.message };
  }

  const { error: iErr } = await supabase.from('user_shipping_addresses').insert({
    user_id: user.id,
    recipient_name: recipientName,
    phone,
    address_full: addressFull,
    is_default: makeDefault,
    sort_order: n,
    updated_at: new Date().toISOString(),
  });

  if (iErr) return { error: iErr.message };

  if (makeDefault) {
    await syncProfileShippingFromDefault(supabase, user.id);
  }

  revalidateMain();
  return {};
}

export async function updateUserShippingAddress(payload: {
  id: string;
  recipientName: string;
  phone: string;
  addressFull: string;
}): Promise<{ error?: string }> {
  const recipientName = payload.recipientName.trim();
  const phone = payload.phone.trim();
  const addressFull = payload.addressFull.trim();
  if (!recipientName || recipientName.length > 120) {
    return { error: '請填寫收件人姓名（1–120 字）' };
  }
  if (!phone || phone.length > 40) {
    return { error: '請填寫有效聯絡電話' };
  }
  if (!addressFull || addressFull.length > MAX_SHIPPING_FIELD) {
    return { error: `請填寫完整地址（1–${MAX_SHIPPING_FIELD} 字）` };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data: existing, error: fErr } = await supabase
    .from('user_shipping_addresses')
    .select('id, is_default')
    .eq('user_id', user.id)
    .eq('id', payload.id)
    .maybeSingle();

  if (fErr) return { error: fErr.message };
  if (!existing) return { error: '找不到此收件地址' };

  const { error: uErr } = await supabase
    .from('user_shipping_addresses')
    .update({
      recipient_name: recipientName,
      phone,
      address_full: addressFull,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.id)
    .eq('user_id', user.id);

  if (uErr) return { error: uErr.message };

  if (existing.is_default) {
    await syncProfileShippingFromDefault(supabase, user.id);
  }

  revalidateMain();
  return {};
}

export async function deleteUserShippingAddress(
  id: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data: row, error: fErr } = await supabase
    .from('user_shipping_addresses')
    .select('id, is_default')
    .eq('user_id', user.id)
    .eq('id', id)
    .maybeSingle();

  if (fErr) return { error: fErr.message };
  if (!row) return { error: '找不到此收件地址' };

  const wasDefault = row.is_default;

  const { error: dErr } = await supabase
    .from('user_shipping_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (dErr) return { error: dErr.message };

  if (wasDefault) {
    const { data: nextRow } = await supabase
      .from('user_shipping_addresses')
      .select('id')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextRow) {
      const { error: defErr } = await supabase
        .from('user_shipping_addresses')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', nextRow.id)
        .eq('user_id', user.id);
      if (defErr) return { error: defErr.message };
    }
    await syncProfileShippingFromDefault(supabase, user.id);
  }

  revalidateMain();
  return {};
}

export async function setDefaultUserShippingAddress(
  id: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { data: row, error: fErr } = await supabase
    .from('user_shipping_addresses')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', id)
    .maybeSingle();

  if (fErr) return { error: fErr.message };
  if (!row) return { error: '找不到此收件地址' };

  const { error: clearErr } = await supabase
    .from('user_shipping_addresses')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (clearErr) return { error: clearErr.message };

  const { error: setErr } = await supabase
    .from('user_shipping_addresses')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (setErr) return { error: setErr.message };

  await syncProfileShippingFromDefault(supabase, user.id);
  revalidateMain();
  return {};
}

export async function saveShopPersonalizeRecommendations(
  enabled: boolean,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { error } = await supabase
    .from('user_profiles')
    .update({
      shop_personalize_recommendations: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidateMain();
  return {};
}
