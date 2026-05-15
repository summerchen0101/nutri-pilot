import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { EmptyStateActionLink } from '@/components/ui/empty-state-action-link';
import { SectionCard } from '@/components/ui/section-card';
import { cn } from '@/lib/utils/cn';

const EMPTY_STATE_ACTION_LINK_CLASS =
  'mt-4 inline-flex min-h-11 items-center justify-center rounded-[10px] border-[1.5px] border-primary px-[18px] py-[11px] text-body font-medium text-primary transition-colors duration-150 ease-out hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

interface EmptyStateProps {
  message: string;
  /** 裝飾用大型圖示（置於訊息上方） */
  icon?: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
  /** 在使用預設 Link 動作時，導覽前觸發（例如關閉上層 sheet／panel） */
  onActionNavigate?: () => void;
  action?: ReactNode;
}

export function EmptyState({
  message,
  icon: Icon,
  actionLabel,
  actionHref,
  onActionNavigate,
  action,
}: EmptyStateProps) {
  return (
    <SectionCard
      className={cn(
        'text-center',
        Icon ? 'px-6 py-10 sm:px-8' : 'p-6',
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center',
          Icon ? 'gap-5' : 'gap-3',
        )}
      >
        {Icon ? (
          <div
            className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-primary-light"
            aria-hidden
          >
            <Icon className="h-10 w-10 text-primary-foreground" strokeWidth={1.35} />
          </div>
        ) : null}
        <p className="max-w-md text-body leading-relaxed text-muted-foreground">
          {message}
        </p>
      </div>
      {action ? (
        <div className="mt-4">{action}</div>
      ) : actionHref && actionLabel ? (
        onActionNavigate ? (
          <EmptyStateActionLink
            href={actionHref}
            label={actionLabel}
            className={EMPTY_STATE_ACTION_LINK_CLASS}
            onNavigate={onActionNavigate}
          />
        ) : (
          <Link href={actionHref} className={EMPTY_STATE_ACTION_LINK_CLASS}>
            {actionLabel}
          </Link>
        )
      ) : null}
    </SectionCard>
  );
}
