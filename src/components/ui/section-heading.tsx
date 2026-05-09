import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface SectionHeadingProps {
  icon: LucideIcon;
  children: ReactNode;
  as?: 'h2' | 'h3' | 'p' | 'span';
  tone?: 'default' | 'primary';
  className?: string;
  iconClassName?: string;
}

export function SectionHeading({
  icon: Icon,
  children,
  as = 'p',
  tone = 'default',
  className,
  iconClassName,
}: SectionHeadingProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        'flex items-center gap-2 text-[15px] font-medium',
        tone === 'primary' ? 'text-primary' : 'text-foreground',
        className,
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
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
