'use client';

import { Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface ShopRightSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 標題字色（例：購物車用 text-primary） */
  titleClassName?: string;
  children: ReactNode;
}

export function ShopRightSheet({
  open,
  onClose,
  title,
  titleClassName,
  children,
}: ShopRightSheetProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-end',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/35 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        aria-label="關閉"
        onClick={onClose}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          'relative flex h-full min-h-0 w-full max-w-md flex-col bg-[var(--color-background-primary)] transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
          <h2
            className={cn(
              'text-heading-page text-foreground',
              titleClassName,
            )}
          >
            {title}
          </h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent text-[#4C956C] transition-colors hover:bg-secondary hover:text-[#3A7A56] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background-primary)]"
            aria-label="關閉"
            onClick={onClose}
          >
            <Minus className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
