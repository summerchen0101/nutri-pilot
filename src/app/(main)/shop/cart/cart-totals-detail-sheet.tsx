'use client';

import { Info } from 'lucide-react';

import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { Button } from '@/components/ui/button';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface CartTotalsDetailSheetProps {
  open: boolean;
  onClose: () => void;
  itemsSubtotal: number;
  shippingTotal: number;
  grandTotal: number;
}

export function CartTotalsDetailSheet({
  open,
  onClose,
  itemsSubtotal,
  shippingTotal,
  grandTotal,
}: CartTotalsDetailSheetProps) {
  return (
    <BottomSheetShell open={open} title="結帳明細" onClose={onClose}>
      <div className="space-y-3 text-body text-foreground">
        <div className="flex justify-between gap-3 text-muted-foreground">
          <span>商品金額</span>
          <span className="tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(itemsSubtotal)}
          </span>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <span>運費合計</span>
          <span className="tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(shippingTotal)}
          </span>
        </div>
        <div className="border-t-hairline border-border pt-3">
          <div className="flex justify-between gap-3 font-medium">
            <span className="text-primary">訂單總計</span>
            <span className="text-heading-section tabular-nums text-primary">
              NT$ {formatShopGroupedInteger(grandTotal)}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-1.5 pt-1 text-caption text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>皆以新台幣（TWD）付款</span>
        </div>
        <Button type="button" className="mt-2 w-full" onClick={onClose}>
          關閉
        </Button>
      </div>
    </BottomSheetShell>
  );
}
