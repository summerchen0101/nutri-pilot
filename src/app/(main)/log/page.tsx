import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { LogContentSkeleton } from '@/app/(main)/log/log-content-skeleton';
import { LogPageContent } from '@/app/(main)/log/log-page-content';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { getCachedAuthContext } from '@/lib/auth';

export default async function LogPage({
  searchParams,
}: {
  searchParams?: {
    date?: string;
    meal_type?: string;
    tab?: string;
  };
}) {
  const { user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  return (
    <div className="space-y-3">
      <StickyPageHeader title="每日紀錄" spacing="compact" />

      <Suspense fallback={<LogContentSkeleton />}>
        <LogPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
