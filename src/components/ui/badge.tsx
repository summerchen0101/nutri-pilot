import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'info'
  | 'warning';

const variantClass: Record<BadgeVariant, string> = {
  default:
    'border-[0.5px] border-transparent bg-secondary text-secondary-foreground',
  secondary:
    'border-[0.5px] border-transparent bg-secondary text-muted-foreground',
  outline:
    'border-[0.5px] border-border bg-transparent text-foreground',
  success:
    'border-[0.5px] border-transparent bg-primary font-medium text-white',
  info: 'border-[0.5px] border-transparent bg-steel-panel font-medium text-steel-foreground',
  warning:
    'border-[0.5px] border-transparent bg-[#FDF0D5] font-medium text-[#854F0B]',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = 'secondary',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
