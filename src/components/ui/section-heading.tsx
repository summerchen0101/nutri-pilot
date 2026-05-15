import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface SectionHeadingProps {
  icon: LucideIcon;
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

  return (
    <Tag
      className={cn(
        'flex items-center gap-2',
        isNested ? 'text-heading-card' : 'text-heading-section',
        tone === 'primary' ? 'text-primary' : 'text-foreground',
        className,
      )}
    >
      <Icon
        className={cn(
          'shrink-0',
          isNested ? 'h-3.5 w-3.5' : 'h-4 w-4',
          tone === 'primary' ? 'text-primary' : 'text-muted-foreground',
          iconClassName,
        )}
        strokeWidth={1.8}
        aria-hidden
      />
      <span>{children}</span>
    </Tag>
  );
}
