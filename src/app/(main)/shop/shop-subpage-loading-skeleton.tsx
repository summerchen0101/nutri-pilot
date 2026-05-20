import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { cn } from '@/lib/utils/cn';

interface ShopSubpageLoadingSkeletonProps {
  ariaLabel?: string;
  className?: string;
}

export function ShopSubpageLoadingSkeleton({
  ariaLabel = '載入商城頁面',
  className,
}: ShopSubpageLoadingSkeletonProps) {
  return (
    <div
      className={cn('space-y-4 pb-6', STICKY_PAGE_HEADER_TOP_SAFE_CLASS, className)}
      aria-busy
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted/80" />
          <div className="h-6 w-28 animate-pulse rounded-lg bg-muted/80" />
        </div>
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted/70" />
      </div>
      <div className="h-36 w-full animate-pulse rounded-xl bg-muted/70" />
      <div className="space-y-2">
        <div className="h-16 w-full animate-pulse rounded-xl bg-muted/60" />
        <div className="h-16 w-full animate-pulse rounded-xl bg-muted/60" />
        <div className="h-16 w-full animate-pulse rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}

export function ShopProductDetailLoadingSkeleton() {
  return (
    <div
      className={cn('space-y-4 pb-6', STICKY_PAGE_HEADER_TOP_SAFE_CLASS)}
      aria-busy
      aria-label="載入商品詳情"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted/80" />
          <div className="h-6 w-32 animate-pulse rounded-lg bg-muted/80" />
        </div>
        <div className="flex gap-1">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted/70" />
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted/70" />
        </div>
      </div>
      <div className="aspect-square w-full animate-pulse rounded-xl bg-muted/70" />
      <div className="space-y-2">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted/80" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted/60" />
        <div className="h-20 w-full animate-pulse rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}

export function CommerceShortcutLoadingSkeleton({
  ariaLabel = '載入中',
}: {
  ariaLabel?: string;
}) {
  return (
    <div
      className={cn('space-y-4 pb-6', STICKY_PAGE_HEADER_TOP_SAFE_CLASS)}
      aria-busy
      aria-label={ariaLabel}
    >
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted/80" />
        <div className="h-6 w-24 animate-pulse rounded-lg bg-muted/80" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
      <div className="space-y-2">
        <div className="h-[72px] w-full animate-pulse rounded-xl bg-muted/70" />
        <div className="h-[72px] w-full animate-pulse rounded-xl bg-muted/60" />
        <div className="h-[72px] w-full animate-pulse rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}
