export default function DashboardLoading() {
  return (
    <div className="space-y-4" aria-busy aria-label="載入總覽">
      <div className="flex items-center justify-between gap-2">
        <div className="h-7 w-36 animate-pulse rounded-lg bg-muted/80" />
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted/70" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-24 animate-pulse rounded-[10px] bg-muted/70" />
        <div className="h-24 animate-pulse rounded-[10px] bg-muted/70" />
      </div>
      <div className="h-[200px] w-full animate-pulse rounded-xl bg-muted/60" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-28 animate-pulse rounded-xl bg-muted/70" />
        <div className="h-28 animate-pulse rounded-xl bg-muted/70" />
      </div>
    </div>
  );
}
