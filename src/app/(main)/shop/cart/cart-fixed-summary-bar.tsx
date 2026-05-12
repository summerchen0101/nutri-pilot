'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useCartDerived } from '@/lib/shop/use-cart-derived';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import { cn } from '@/lib/utils/cn';

/** BottomNav 主選單高度概估 + safe area，使固定列疊在導航列上方 */
const FIXED_BAR_BOTTOM_CLASS = 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]';

interface CartFixedSummaryBarProps {
  maxLeadTimeDays: number;
}

export function CartFixedSummaryBar({ maxLeadTimeDays }: CartFixedSummaryBarProps) {
  const router = useRouter();
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);
  const [expanded, setExpanded] = useState(false);
  const {
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    validLines,
    hasLegacyLines,
  } = useCartDerived();

  function goCheckout() {
    closeCartPanel();
    router.push('/shop/checkout');
  }

  const shipNote =
    maxLeadTimeDays > 0 ?
      `訂單所含商品預計需約 ${maxLeadTimeDays} 個工作天起由廠商準備出貨（依商品與廠商作業為準）`
    : '出貨天數將於結帳時依廠商與商品確認';

  return (
    <div
      className={cn(
        'pointer-events-none fixed left-0 right-0 z-30 flex justify-center px-4',
        FIXED_BAR_BOTTOM_CLASS,
      )}>
      <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-t-xl border-hairline border-border border-b-0 bg-[var(--color-background-primary)]">
        <p className="bg-[#1E212B] px-3 py-2 text-center text-caption text-white/95">
          {shipNote}
        </p>
        <div className="border-t-hairline border-border px-3 pt-2.5">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 py-1 text-left"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}>
            <span className="flex items-center gap-1 text-body text-foreground">
              結帳總金額
              {expanded ?
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
            </span>
            <span className="text-heading-page tabular-nums text-primary">
              NT$ {formatShopGroupedInteger(grandTotal)}
            </span>
          </button>

          {expanded ?
            <div className="space-y-2 border-t-hairline border-border py-3 text-caption text-muted-foreground">
              <div className="flex justify-between gap-3">
                <span>商品小計</span>
                <span className="tabular-nums text-foreground">
                  NT$ {formatShopGroupedInteger(itemsSubtotal)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>運費合計</span>
                <span className="tabular-nums text-foreground">
                  NT$ {formatShopGroupedInteger(shippingTotal)}
                </span>
              </div>
            </div>
          : null}

          <div className="flex flex-col gap-2 border-t-hairline border-border pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="w-full"
              disabled={!validLines.length || hasLegacyLines}
              onClick={goCheckout}>
              繼續結帳
            </Button>
            <Link
              href="/shop"
              className="block text-center text-caption font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => closeCartPanel()}>
              繼續購物
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
