'use client';

import { Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  STICKY_HEADER_ELEVATED_CLASS,
  STICKY_HEADER_REST_CLASS,
} from '@/components/layout/sticky-page-header-shell';
import { cn } from '@/lib/utils/cn';

interface ShopRightSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 標題字色覆寫（預設 `text-foreground`） */
  titleClassName?: string;
  /** `solid`：整側白底（預設）。`mutedBody`：aside 淺灰；標題列預設透明，見 `elevatedHeader` */
  asideVariant?: 'solid' | 'mutedBody';
  /** 僅 `mutedBody`：列表捲動後標題列升起（與 `StickyPageHeaderShell` 同款背景／細邊） */
  elevatedHeader?: boolean;
  children: ReactNode;
}

export function ShopRightSheet({
  open,
  onClose,
  title,
  titleClassName,
  asideVariant = 'solid',
  elevatedHeader = false,
  children,
}: ShopRightSheetProps) {
  const isMutedBody = asideVariant === 'mutedBody';

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
          'relative flex h-full min-h-0 w-full max-w-md flex-col transition-transform duration-300 ease-out',
          isMutedBody ? 'bg-neutral-bg-secondary' : 'bg-[var(--color-background-primary)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-between gap-2 px-3 py-2',
            isMutedBody ?
              cn(
                'transition-[background-color,border-color,backdrop-filter] duration-200 ease-out',
                elevatedHeader ?
                  STICKY_HEADER_ELEVATED_CLASS
                : STICKY_HEADER_REST_CLASS,
              )
            : '',
          )}
        >
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
