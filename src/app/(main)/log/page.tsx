import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { History } from 'lucide-react';

import { LogContentSkeleton } from '@/app/(main)/log/log-content-skeleton';
import { LogPageContent } from '@/app/(main)/log/log-page-content';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { getCachedAuthContext } from '@/lib/auth';
import { getLogDateMode, isoDateOk } from '@/lib/log/log-date-policy';
import { getLogPageTitle } from '@/lib/log/log-date-label';
import { todayLocalISODate } from '@/lib/onboarding/date';

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

  const today = todayLocalISODate();
  const rawDate = searchParams?.date;
  const activeDate =
    typeof rawDate === 'string' && isoDateOk(rawDate) ? rawDate : today;
  const pageTitle = getLogPageTitle(activeDate, today);
  const isLogToday = getLogDateMode(activeDate, today) === 'today';

  return (
    <div className="space-y-3">
      <StickyPageHeader
        leading={isLogToday ? undefined : <HeaderBackButton />}
        title={pageTitle}
        spacing="compact"
        action={
          isLogToday ? (
            <Link
              href="/log/history"
              aria-label="過往紀錄"
              className={HEADER_ACTION_ICON_CLASS}
            >
              <History
                className="h-[18px] w-[18px]"
                aria-hidden
                strokeWidth={1.75}
              />
            </Link>
          ) : undefined
        }
      />

      <Suspense fallback={<LogContentSkeleton />}>
        <LogPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
