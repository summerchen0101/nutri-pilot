import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

interface SettingsRowProps {
  label: string;
  /** 顯示在標題右側（如說明按鈕）；若置於互動列內請在按鈕 onClick 內 stopPropagation */
  labelAccessory?: ReactNode;
  value?: string;
  href?: string;
  onClick?: () => void;
  valueClassName?: string;
  trailing?: ReactNode;
  danger?: boolean;
  withBorder?: boolean;
}

export function SettingsRow({
  label,
  labelAccessory,
  value,
  href,
  onClick,
  valueClassName,
  trailing,
  danger,
  withBorder = true,
}: SettingsRowProps) {
  const isLink = typeof href === 'string' && href.length > 0;
  const isInteractive = isLink || typeof onClick === 'function';

  const rowClass = cn(
    'flex w-full items-center justify-between border-0 border-b-hairline py-3 text-left',
    withBorder ? 'border-border' : 'border-transparent',
    isInteractive && 'appearance-none bg-transparent',
    !isInteractive && 'bg-transparent',
  );

  const inner = (
    <>
      <span className="flex flex-wrap items-center gap-1.5">
        <span
          className={
            danger
              ? 'text-[13px] text-destructive'
              : 'text-[13px] text-neutral-text-tertiary'
          }
        >
          {label}
        </span>
        {labelAccessory ?? null}
      </span>
      <div className="flex min-w-0 max-w-[65%] items-center justify-end gap-2">
        {value ? (
          <span
            className={cn(
              'truncate text-[13px] text-foreground',
              valueClassName,
            )}>
            {value}
          </span>
        ) : null}
        {trailing ??
          (isInteractive ? (
            <ChevronRight
              aria-hidden
              className={cn(
                'h-4 w-4 shrink-0',
                danger ? 'text-destructive' : 'text-neutral-text-tertiary',
              )}
              strokeWidth={2}
            />
          ) : null)}
      </div>
    </>
  );

  if (isLink) {
    return (
      <Link href={href} className={rowClass}>
        {inner}
      </Link>
    );
  }

  if (isInteractive) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {inner}
      </button>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}
