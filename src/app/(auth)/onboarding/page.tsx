import { redirect } from 'next/navigation';

import { OnboardingWizard } from '@/app/(auth)/onboarding/onboarding-wizard';
import { hasCompletedOnboarding } from '@/lib/onboarding/status';
import { createClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (await hasCompletedOnboarding(supabase, user.id)) {
    redirect('/dashboard');
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  const { data: goal } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  return (
    <div className="flex justify-center py-10">
      <OnboardingWizard
        userId={user.id}
        initialProfile={profile}
        initialGoal={goal}
      />
    </div>
  );
}
