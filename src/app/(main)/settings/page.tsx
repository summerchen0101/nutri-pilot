import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { SettingsPageBody } from '@/app/(main)/settings/settings-page-body';
import { SettingsPageSkeleton } from '@/app/(main)/settings/settings-page-skeleton';
import { getCachedAuthContext } from '@/lib/auth';

export default async function SettingsPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsPageBody />
    </Suspense>
  );
}
