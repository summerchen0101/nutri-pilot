import { LogContentSkeleton } from '@/app/(main)/log/log-content-skeleton';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';

export default function LogLoading() {
  return (
    <div className="space-y-3" aria-busy aria-label="載入紀錄">
      <StickyPageHeader title="每日紀錄" spacing="compact" />
      <LogContentSkeleton />
    </div>
  );
}
