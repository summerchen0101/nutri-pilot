export function SettingsPageSkeleton() {
  return (
    <div className="space-y-3" aria-busy aria-label="載入我的">
      <div className="h-36 w-full animate-pulse rounded-xl bg-muted/80" />
      <div className="h-28 w-full animate-pulse rounded-xl bg-muted/70" />
      <div className="h-40 w-full animate-pulse rounded-xl bg-muted/60" />
    </div>
  );
}
