export function ShopBannerSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-muted/50" aria-hidden>
      <div className="aspect-[3/1] w-full animate-pulse bg-muted/70" />
    </div>
  );
}

export function ShopHomeSkeleton() {
  return (
    <div className="space-y-5" aria-busy aria-label="載入商城資料">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`pd-${i}`}
            className="space-y-2 rounded-xl bg-card p-3"
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
