import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface SettingsRowProps {
  label: string;
  value?: string;
  onClick?: () => void;
  valueClassName?: string;
  trailing?: ReactNode;
  danger?: boolean;
  withBorder?: boolean;
}

export function SettingsRow({
  label,
  value,
  onClick,
  valueClassName,
  trailing,
  danger,
  withBorder = true,
}: SettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full appearance-none items-center justify-between border-0 border-b-hairline bg-transparent py-3 text-left',
        withBorder ? 'border-border' : 'border-transparent',
      ].join(' ')}
    >
      <span className={danger ? 'text-[13px] text-destructive' : 'text-[13px] text-neutral-text-tertiary'}>
        {label}
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
        {trailing ?? <span className={danger ? 'text-destructive' : 'text-neutral-text-tertiary'}>{'>'}</span>}
      </div>
    </button>
  );
}
