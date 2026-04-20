import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export function SectionCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn('rounded-xl border-[0.5px] border-border bg-card p-4', className)}
      {...props}
    />
  );
}
