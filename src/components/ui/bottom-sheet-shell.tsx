'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheetShell({ open, title, onClose, children }: BottomSheetShellProps) {
  if (!open) return null;

  const node = (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/35" aria-label="關閉" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-[16px] border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-secondary)]" />
        <h2 className="mb-3 text-[15px] font-medium text-foreground">{title}</h2>
        {children}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
