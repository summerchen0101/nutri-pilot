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
      <p className="text-[13px] text-muted-foreground">{message}</p>
      {action ? (
        <div className="mt-4">{action}</div>
      ) : actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center justify-center rounded-[10px] border-[1.5px] border-primary px-4 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-primary-light"
        >
          {actionLabel}
        </Link>
      ) : null}
    </SectionCard>
  );
}
