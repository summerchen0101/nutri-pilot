import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface MetricTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export function MetricTile({ label, value, hint, className }: MetricTileProps) {
  return (
    <div className={cn('rounded-[10px] border-[0.5px] border-border bg-secondary/40 p-3', className)}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-[20px] font-medium leading-tight text-foreground">{value}</p>
      {hint ? <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
