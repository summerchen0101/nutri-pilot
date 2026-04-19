import { redirect } from 'next/navigation';

import { DashboardHome } from '@/app/(main)/dashboard/dashboard-home';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: profile }, { data: latestVital }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('name, weight_kg, height_cm, bmi')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('vital_logs')
      .select('weight_kg, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile) redirect('/onboarding');

  const latestWeightKg =
    latestVital?.weight_kg != null
      ? Number(latestVital.weight_kg)
      : Number(profile.weight_kg);
  const latestWeightDate = latestVital?.date ?? null;

  return (
    <DashboardHome
      displayName={profile.name}
      latestWeightKg={Number.isFinite(latestWeightKg) ? latestWeightKg : null}
      latestWeightDate={latestWeightDate}
      heightCm={Number(profile.height_cm)}
      profileBmi={
        profile.bmi != null ? Number(profile.bmi) : null
      }
    />
  );
}
