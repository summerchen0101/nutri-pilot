import { redirect } from 'next/navigation';

import { hasCompletedOnboarding } from '@/lib/onboarding/status';
import { createClient } from '@/lib/supabase/server';

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return children;
  }

  const completed = await hasCompletedOnboarding(supabase, user.id);
  if (!completed) {
    redirect('/onboarding');
  }

  return children;
}
