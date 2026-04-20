import { redirect } from 'next/navigation';

import {
  SettingsView,
  type SettingsInitialData,
} from '@/app/(main)/settings/settings-view';
import { createClient } from '@/lib/supabase/server';

function toDayCount(createdAt: string | null | undefined): number {
  if (!createdAt) return 1;
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return 1;
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / 86400000) + 1;
  return Math.max(days, 1);
}

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [
    { data: profile, error: profileErr },
    { data: goal },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
    supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (profileErr || !profile) redirect('/onboarding');
  if (!goal) redirect('/onboarding');

  const initial: SettingsInitialData = {
    // Some environments may not have user_profiles.created_at in generated types yet.
    // Read it defensively from row payload to keep day-count from profile signup time.
    dayCount: toDayCount(
      (profile as { created_at?: string | null }).created_at ?? user.created_at ?? null,
    ),
    name: profile.name ?? '',
    email: user.email ?? '',
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    bmi: profile.bmi != null ? Number(profile.bmi) : null,
    bmr: profile.bmr != null ? Number(profile.bmr) : null,
    tdee: profile.tdee != null ? Number(profile.tdee) : null,
    dietType: profile.diet_type,
    mealFrequency: profile.meal_frequency ?? 3,
    avoidFoods: profile.avoid_foods ?? [],
    allergens: profile.allergens ?? [],
    dietMethod: profile.diet_method ?? 'mediterranean',
    goal: {
      type: goal.type,
      targetWeightKg: Number(goal.target_weight_kg),
      weeklyRateKg: Number(goal.weekly_rate_kg),
      dailyCalTarget: Number(goal.daily_cal_target),
      targetDate: goal.target_date ?? null,
    },
  };

  return <SettingsView initial={initial} />;
}
