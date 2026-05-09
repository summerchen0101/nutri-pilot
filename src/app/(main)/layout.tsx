import { redirect } from 'next/navigation';

import { MainAppShell } from '@/components/layout/main-app-shell';
import { getCachedAuthContext } from '@/lib/auth';
import { hasCompletedOnboarding } from '@/lib/onboarding/status';

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) {
    return children;
  }

  const completed = await hasCompletedOnboarding(supabase, user.id);
  if (!completed) {
    redirect('/onboarding');
  }

  return <MainAppShell>{children}</MainAppShell>;
}
