import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

interface MetricTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export function MetricTile({ label, value, hint, className }: MetricTileProps) {
  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col rounded-[10px] bg-card p-3",
        className,
      )}>
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-heading-page leading-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <div className="mt-1 min-w-0 break-words text-caption leading-relaxed text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
