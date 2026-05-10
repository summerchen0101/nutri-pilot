export function ShopHomeSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="載入商城資料">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`cat-${i}`}
            className="h-9 w-14 shrink-0 animate-pulse rounded-full bg-muted/70"
          />
        ))}
      </div>
      <div className="h-5 w-28 animate-pulse rounded-md bg-muted/80" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`pd-${i}`}
            className="space-y-2 rounded-xl border border-[0.5px] border-border bg-card p-3"
          >
            <div className="aspect-square w-full animate-pulse rounded-lg bg-muted/70" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted/80" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
