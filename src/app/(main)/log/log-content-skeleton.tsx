import { SectionCard } from '@/components/ui/section-card';

export function LogContentSkeleton() {
  return (
    <SectionCard className="space-y-4 p-4" aria-busy aria-label="載入紀錄">
      <div className="flex gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-xl bg-muted/70" />
        <div className="h-9 flex-1 animate-pulse rounded-xl bg-muted/70" />
      </div>
      <div className="h-24 w-full animate-pulse rounded-xl bg-muted/80" />
      <div className="h-40 w-full animate-pulse rounded-xl bg-muted/60" />
    </SectionCard>
  );
}
