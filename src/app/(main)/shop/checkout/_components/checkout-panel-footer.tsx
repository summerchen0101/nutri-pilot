'use client';

import { Button } from '@/components/ui/button';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface CheckoutPanelFooterProps {
  grandTotal: number;
  pending: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}

export function CheckoutPanelFooter({
  grandTotal,
  pending,
  canSubmit,
  onSubmit,
}: CheckoutPanelFooterProps) {
  return (
    <div className="w-full shrink-0 border-t-hairline border-border/60 bg-[var(--color-background-primary)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-caption text-muted-foreground">總計</p>
          <p className="text-heading-page tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(grandTotal)}
          </p>
        </div>
        <Button
          type="button"
          variant="default"
          size="default"
          className="min-w-[140px] shrink-0 px-5"
          disabled={pending || !canSubmit}
          onClick={onSubmit}
        >
          {pending ? '處理中…' : '送出訂單'}
        </Button>
      </div>
    </div>
  );
}
