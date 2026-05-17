'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils/cn';

/** 與 `duration-200` 對齊；關閉時延遲卸載讓離場動畫播完 */
export const BOTTOM_SHEET_TRANSITION_MS = 220;

interface BottomSheetShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheetShell({ open, title, onClose, children }: BottomSheetShellProps) {
  const [present, setPresent] = useState(open);
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnter(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setEnter(false);
    const t = window.setTimeout(() => setPresent(false), BOTTOM_SHEET_TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open && !present) return null;

  const node = (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/35 transition-opacity duration-200 ease-out',
          enter ? 'opacity-100' : 'opacity-0',
        )}
        aria-label="關閉"
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 rounded-t-[16px] bg-[var(--color-background-primary)] px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] transition-[transform,opacity] duration-200 ease-out',
          enter ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-secondary)]" />
        <h2 className="mb-3 text-heading-page text-foreground">{title}</h2>
        {children}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
