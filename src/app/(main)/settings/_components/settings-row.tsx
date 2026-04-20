import type { ReactNode } from 'react';

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
        'flex w-full appearance-none items-center justify-between border-0 border-b-[0.5px] bg-transparent py-3 text-left',
        withBorder ? 'border-border' : 'border-transparent',
      ].join(' ')}
    >
      <span className={danger ? 'text-[13px] text-destructive' : 'text-[13px] text-neutral-text-tertiary'}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        {value ? <span className={valueClassName ?? 'text-[13px] text-foreground'}>{value}</span> : null}
        {trailing ?? <span className={danger ? 'text-destructive' : 'text-neutral-text-tertiary'}>{'>'}</span>}
      </div>
    </button>
  );
}
