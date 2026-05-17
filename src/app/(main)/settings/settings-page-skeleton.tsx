import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { cn } from '@/lib/utils/cn';

export function SettingsPageSkeleton() {
  return (
    <div
      className={cn('space-y-3', STICKY_PAGE_HEADER_TOP_SAFE_CLASS)}
      aria-busy
      aria-label="載入我的">
      <div className="h-36 w-full animate-pulse rounded-xl bg-muted/80" />
      <div className="h-28 w-full animate-pulse rounded-xl bg-muted/70" />
      <div className="h-40 w-full animate-pulse rounded-xl bg-muted/60" />
    </div>
  );
}
