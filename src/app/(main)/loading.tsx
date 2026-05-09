export default function MainLoading() {
  return (
    <div className="relative min-h-screen bg-surface-secondary">
      <div className="mx-auto max-w-sm px-4 pb-28 pt-5">
        <div className="space-y-4" aria-busy aria-label="載入中">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted/80" />
          <div className="h-[200px] w-full animate-pulse rounded-xl bg-muted/70" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-24 animate-pulse rounded-xl bg-muted/70" />
            <div className="h-24 animate-pulse rounded-xl bg-muted/70" />
          </div>
          <div className="h-32 w-full animate-pulse rounded-xl bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
