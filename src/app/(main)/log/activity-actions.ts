'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

const ACTIVITY_TYPES = [
  'walk',
  'run',
  'strength',
  'yoga',
  'cardio',
  'other',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

function isActivityType(s: string): s is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(s);
}

export async function insertActivityLogAction(input: {
  loggedDate: string;
  activityType: string;
  durationMinutes: number;
  caloriesEst?: number | null;
  notes?: string | null;
}): Promise<{ error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.loggedDate)) {
    return { error: '日期格式不正確' };
  }
  if (!isActivityType(input.activityType)) {
    return { error: '運動類型不正確' };
  }
  const dm = Math.round(Number(input.durationMinutes));
  if (!Number.isFinite(dm) || dm < 1 || dm > 1440) {
    return { error: '請輸入 1–1440 分鐘' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { error } = await supabase.from('activity_logs').insert({
    user_id: user.id,
    logged_date: input.loggedDate,
    activity_type: input.activityType,
    duration_minutes: dm,
    calories_est:
      input.caloriesEst != null && Number.isFinite(Number(input.caloriesEst))
        ? Number(input.caloriesEst)
        : null,
    notes: input.notes?.trim() ? input.notes.trim().slice(0, 500) : null,
  });

  if (error) return { error: error.message };
  revalidatePath('/log');
  revalidatePath('/dashboard');
  revalidatePath('/analytics');
  return {};
}

export async function deleteActivityLogAction(
  id: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登入' };

  const { error } = await supabase
    .from('activity_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/log');
  revalidatePath('/dashboard');
  revalidatePath('/analytics');
  return {};
}
