import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { cn } from '@/lib/utils/cn';

export default function SettingsOrdersLoading() {
  return (
    <div
      className={cn('space-y-4 pb-6', STICKY_PAGE_HEADER_TOP_SAFE_CLASS)}
      aria-busy
      aria-label="載入我的訂單"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted/80" />
          <div className="h-6 w-24 animate-pulse rounded-lg bg-muted/80" />
        </div>
      </div>
      <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
      <div className="space-y-2">
        <div className="h-[220px] w-full animate-pulse rounded-xl bg-muted/70" />
        <div className="h-[220px] w-full animate-pulse rounded-xl bg-muted/60" />
        <div className="h-[220px] w-full animate-pulse rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}
