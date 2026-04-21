import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  leading?: ReactNode;
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
  spacing?: 'compact' | 'default';
  className?: string;
}

export function PageHeader({
  leading,
  title,
  description,
  meta,
  action,
  spacing = 'default',
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-3',
        spacing === 'default' ? 'pb-1' : '',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
        <div className="min-w-0 space-y-1">
          <h1 className="text-[20px] font-medium text-foreground">{title}</h1>
          {description ? (
            <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
          {meta ? <div className="pt-0.5">{meta}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
