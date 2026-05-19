import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface SectionHeadingProps {
  icon?: LucideIcon;
  children: ReactNode;
  as?: 'h2' | 'h3' | 'p' | 'span';
  variant?: 'default' | 'nested';
  tone?: 'default' | 'primary';
  className?: string;
  iconClassName?: string;
}

export function SectionHeading({
  icon: Icon,
  children,
  as = 'p',
  variant = 'default',
  tone = 'default',
  className,
  iconClassName,
}: SectionHeadingProps) {
  const Tag = as;
  const isNested = variant === 'nested';
  const resolvedTone = isNested ? 'primary' : tone;

  return (
    <Tag
      className={cn(
        Icon ? 'flex items-center gap-2' : 'block',
        'text-heading-section',
        resolvedTone === 'primary' ? 'text-primary' : 'text-foreground',
        className,
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            'shrink-0',
            isNested ? 'h-3.5 w-3.5' : 'h-4 w-4',
            resolvedTone === 'primary'
              ? 'text-primary'
              : 'text-muted-foreground',
            iconClassName,
          )}
          strokeWidth={1.8}
          aria-hidden
        />
      ) : null}
      <span>{children}</span>
    </Tag>
  );
}
