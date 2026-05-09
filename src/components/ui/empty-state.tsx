import Link from 'next/link';
import type { ReactNode } from 'react';

import { SectionCard } from '@/components/ui/section-card';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  action?: ReactNode;
}

export function EmptyState({ message, actionLabel, actionHref, action }: EmptyStateProps) {
  return (
    <SectionCard className="p-6 text-center">
      <p className="text-body text-muted-foreground">{message}</p>
      {action ? (
        <div className="mt-4">{action}</div>
      ) : actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center justify-center rounded-[10px] border-[1.5px] border-primary px-[18px] py-[9px] text-body font-medium text-primary transition-colors duration-150 ease-out hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {actionLabel}
        </Link>
      ) : null}
    </SectionCard>
  );
}
