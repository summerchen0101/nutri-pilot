'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  STICKY_HEADER_ELEVATED_CLASS,
  STICKY_HEADER_REST_CLASS,
} from '@/components/layout/sticky-page-header-shell';
import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { cn } from '@/lib/utils/cn';

interface ShopRightSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 標題左側（例如返回鈕）；與標題、關閉鈕採三欄對齊 */
  leading?: ReactNode;
  /** 標題列下方的額外列（例如進度步驟） */
  belowTitleRow?: ReactNode;
  /** 標題字色覆寫（預設 `text-foreground`） */
  titleClassName?: string;
  /** `solid`：整側白底（預設）。`mutedBody`：aside 淺灰；標題列預設透明，見 `elevatedHeader` */
  asideVariant?: 'solid' | 'mutedBody';
  /** 僅 `mutedBody`：列表捲動後標題列升起（與 `StickyPageHeaderShell` 同款背景／細邊） */
  elevatedHeader?: boolean;
  /** 最外層疊層 z-index（預設 `z-50`）；結帳側欄需高於購物車、低於規格 bottom sheet */
  stackZClassName?: string;
  children: ReactNode;
}

export function ShopRightSheet({
  open,
  onClose,
  title,
  leading,
  belowTitleRow,
  titleClassName,
  asideVariant = 'solid',
  elevatedHeader = false,
  stackZClassName = 'z-50',
  children,
}: ShopRightSheetProps) {
  const isMutedBody = asideVariant === 'mutedBody';
  const hasLeading = leading != null;

  const closeButtonClass = cn(
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent',
    'text-foreground transition-opacity hover:opacity-80 active:opacity-95',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-background-primary)]',
  );

  const headerShellClass = cn(
    'shrink-0 px-3 py-2',
    STICKY_PAGE_HEADER_TOP_SAFE_CLASS,
    isMutedBody ?
      cn(
        'transition-[background-color,border-color,backdrop-filter] duration-200 ease-out',
        elevatedHeader ? STICKY_HEADER_ELEVATED_CLASS : STICKY_HEADER_REST_CLASS,
      )
    : '',
  );

  const titleRow = hasLeading ?
    (
      <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1">
        <div className="flex justify-start">{leading}</div>
        <h2
          className={cn(
            'min-w-0 truncate text-center text-heading-page text-foreground',
            titleClassName,
          )}
        >
          {title}
        </h2>
        <div className="flex justify-end">
          <button
            type="button"
            className={closeButtonClass}
            aria-label="關閉"
            onClick={onClose}
          >
            <X className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
      </div>
    )
  : (
      <div className="flex items-center justify-between gap-2">
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
          className={closeButtonClass}
          aria-label="關閉"
          onClick={onClose}
        >
          <X className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>
    );

  return (
    <div
      className={cn(
        'fixed inset-0 flex justify-end',
        stackZClassName,
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
          isMutedBody ? 'bg-[var(--shop-sheet-canvas)]' : 'bg-[var(--color-background-primary)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className={headerShellClass}>
          {titleRow}
          {belowTitleRow ?
            <div className="mt-2">{belowTitleRow}</div>
          : null}
        </div>
        {children}
      </aside>
    </div>
  );
}
