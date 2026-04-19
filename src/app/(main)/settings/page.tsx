import { redirect } from 'next/navigation';

import {
  SettingsView,
  type SettingsInitialData,
} from '@/app/(main)/settings/settings-view';
import { createClient } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [
    { data: profile, error: profileErr },
    { data: goal },
    { data: plan },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
    supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('diet_plans')
      .select('diet_method')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('id, status, frequency, next_ship_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  if (profileErr || !profile) redirect('/onboarding');
  if (!goal || !plan) redirect('/onboarding');

  const initial: SettingsInitialData = {
    name: profile.name ?? '',
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    bmi: profile.bmi != null ? Number(profile.bmi) : null,
    dietType: profile.diet_type,
    mealFrequency: profile.meal_frequency ?? 3,
    avoidFoods: profile.avoid_foods ?? [],
    allergens: profile.allergens ?? [],
    dietMethod: plan.diet_method,
    goal: {
      type: goal.type,
      targetWeightKg: Number(goal.target_weight_kg),
      weeklyRateKg: Number(goal.weekly_rate_kg),
      dailyCalTarget: Number(goal.daily_cal_target),
      targetDate: goal.target_date ?? null,
    },
    subscriptions: subscriptions ?? [],
  };

  return <SettingsView initial={initial} />;
}
