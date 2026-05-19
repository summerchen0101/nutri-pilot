'use client';

import type { MouseEvent } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

import { cn } from '@/lib/utils/cn';

type LabelGuardInfoTriggerProps = {
  ariaLabel: string;
  onOpen: () => void;
  className?: string;
};

export function LabelGuardInfoTrigger({
  ariaLabel,
  onOpen,
  className,
}: LabelGuardInfoTriggerProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    onOpen();
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      className={cn(
        '-m-0.5 inline-flex shrink-0 items-center justify-center rounded-md p-0.5 text-muted-foreground outline-none ring-offset-background transition-opacity hover:opacity-80 active:opacity-70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className,
      )}>
      <FaInfoCircle className="size-[14px]" aria-hidden />
    </button>
  );
}
