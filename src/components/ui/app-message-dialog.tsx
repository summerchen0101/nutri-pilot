'use client';

import { AlertCircle, CircleCheck, Info } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import {
  useAppMessageStore,
  type AppMessageVariant,
} from '@/lib/ui/app-message-store';
import { cn } from '@/lib/utils/cn';

const variantConfig: Record<
  AppMessageVariant,
  {
    Icon: typeof CircleCheck;
    iconWrap: string;
    iconClass: string;
    messageClass: string;
  }
> = {
  success: {
    Icon: CircleCheck,
    iconWrap:
      'bg-[#E8F5EE] border-hairline border-[#4C956C]/25',
    iconClass: 'text-[#4C956C]',
    messageClass: 'text-[#2D6B4A]',
  },
  error: {
    Icon: AlertCircle,
    iconWrap:
      'bg-[#FDF6F5] border-hairline border-[#E24B4A]/20',
    iconClass: 'text-[#E24B4A]',
    messageClass: 'text-[#E24B4A]',
  },
  info: {
    Icon: Info,
    iconWrap:
      'bg-[#E6F1FB] border-hairline border-[#B5D4F4]',
    iconClass: 'text-[#378ADD]',
    messageClass: 'text-foreground',
  },
};

export function AppMessageDialog() {
  const isOpen = useAppMessageStore((s) => s.isOpen);
  const title = useAppMessageStore((s) => s.title);
  const message = useAppMessageStore((s) => s.message);
  const variant = useAppMessageStore((s) => s.variant);
  const hideAppMessage = useAppMessageStore((s) => s.hideAppMessage);

  if (!isOpen) return null;

  const { Icon, iconWrap, iconClass, messageClass } = variantConfig[variant];

  const node = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="關閉"
        onClick={() => hideAppMessage()}
      />
      <div
        className="relative z-[1] w-full max-w-sm rounded-[16px] border-hairline border-border bg-[var(--color-background-primary)] p-5 shadow-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'app-message-dialog-title' : undefined}
        aria-describedby="app-message-dialog-desc"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full',
              iconWrap,
            )}
            aria-hidden
          >
            <Icon className={cn('h-7 w-7 stroke-[1.75]', iconClass)} />
          </div>
          <div className="w-full space-y-1.5">
            {title ? (
              <h2
                id="app-message-dialog-title"
                className="text-heading-page text-foreground"
              >
                {title}
              </h2>
            ) : null}
            <p
              id="app-message-dialog-desc"
              className={cn('text-body leading-relaxed', messageClass)}
            >
              {message}
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="mt-5 w-full"
          onClick={() => hideAppMessage()}
        >
          確定
        </Button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
