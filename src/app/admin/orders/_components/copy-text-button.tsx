'use client';

import { useCallback, useState } from 'react';

import { buttonVisualClassName } from '@/components/ui/button-visual';

interface CopyTextButtonProps {
  readonly value: string;
  readonly label?: string;
}

export function CopyTextButton({ value, label = '複製' }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      disabled={!value}
      className={buttonVisualClassName({ variant: 'outline', size: 'sm' })}
    >
      {copied ? '已複製' : label}
    </button>
  );
}
