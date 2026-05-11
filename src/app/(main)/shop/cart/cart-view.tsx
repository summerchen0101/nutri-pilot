'use client';

import { Package, Store, Truck, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  calcVendorShippingSummaries,
  cartGrandTotal,
  cartTotalShipping,
} from '@/lib/shop/vendor-shipping';
import { cartTotalItemsSubtotal, useCartStore, type CartLine } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface CartViewProps {
  /** `panel`：側欄内列表捲動，預估總計與按鈕固定於底部 */
  layout?: 'page' | 'panel';
}

export function CartView({ layout = 'page' }: CartViewProps) {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const setQty = useCartStore((s) => s.setQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);

  const validLines = useMemo(
    () =>
      lines.filter(
        (l): l is CartLine =>
          Boolean(l.vendorId && l.vendorName && typeof l.unitPrice === 'number'),
      ),
    [lines],
  );

  const summaries = useMemo(
    () => calcVendorShippingSummaries(validLines),
    [validLines],
  );

  const itemsSubtotal = useMemo(
    () => cartTotalItemsSubtotal(validLines),
    [validLines],
  );
  const shippingTotal = useMemo(
    () => cartTotalShipping(summaries),
    [summaries],
  );
  const grandTotal = useMemo(() => cartGrandTotal(validLines), [validLines]);

  const hasLegacyLines = lines.length > 0 && validLines.length < lines.length;

  function goCheckout() {
    closeCartPanel();
    router.push('/shop/checkout');
  }

  function continueShopping() {
    closeCartPanel();
    router.push('/shop');
  }

  if (lines.length === 0) {
    const empty = (
      <EmptyState
        message="購物車是空的"
        actionHref="/shop"
        actionLabel="前往商城"
        onActionNavigate={closeCartPanel}
      />
    );
    if (layout === 'panel') {
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto hide-scrollbar [-webkit-overflow-scrolling:touch]">
            {empty}
          </div>
        </div>
      );
    }
    return empty;
  }

  const vendorBlocks = (
    <div className="space-y-6">
      {hasLegacyLines ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-amber-900">
            購物車含有舊版資料，請清空購物車後重新加入商品。
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-300 text-amber-950 hover:bg-amber-100/80"
            onClick={() => {
              clear();
              router.refresh();
            }}>
            清空購物車
          </Button>
        </div>
      ) : null}

      {summaries.map((block) => (
        <section
          key={block.vendorId}
          className="rounded-xl border-hairline border-border bg-card">
          <div className="flex items-center gap-2 border-b-hairline border-border px-3 py-2.5">
            <Store className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <h2 className="min-w-0 flex-1 text-heading-section text-foreground">
              {block.vendorName}
            </h2>
          </div>

          <ul className="divide-y-hairline divide-border">
            {block.lines.map((line) => (
              <li key={line.variantId} className="px-3 py-4">
                <div className="flex gap-3">
                  <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt=""
                        width={72}
                        height={72}
                        className="h-full w-full object-cover"
                        sizes="72px"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-muted-foreground"
                        aria-hidden>
                        <Package className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0 pr-1">
                        <p className="text-heading-section leading-snug text-foreground">
                          {line.productName}
                        </p>
                        <p className="mt-0.5 text-micro text-muted-foreground">
                          {line.variantLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border-hairline border-border bg-transparent text-foreground transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                        aria-label={`移除 ${line.productName}`}
                        onClick={() => removeLine(line.variantId)}>
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-hairline border-border text-heading-card leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                          onClick={() => setQty(line.variantId, line.qty - 1)}>
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-heading-section tabular-nums text-foreground">
                          {formatShopGroupedInteger(line.qty)}
                        </span>
                        <button
                          type="button"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-hairline border-border text-heading-card leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                          onClick={() => setQty(line.variantId, line.qty + 1)}>
                          +
                        </button>
                      </div>
                      <p className="text-heading-section tabular-nums text-foreground">
                        NT$ {formatShopGroupedInteger(line.unitPrice * line.qty)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t-hairline border-border bg-muted/30 px-3 py-3">
            <div className="flex items-start gap-2 text-[13px] text-muted-foreground">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">配送方式：宅配</p>
                <p className="mt-0.5 text-caption">
                  與全單相同收件地址；可於結帳頁或
                  <Link
                    href="/settings"
                    className="mx-0.5 font-medium text-primary underline-offset-2 hover:underline"
                    onClick={closeCartPanel}>
                    設定
                  </Link>
                  編輯預設資料。
                </p>
                <p className="mt-2 tabular-nums text-foreground">
                  小計 NT${' '}
                  {formatShopGroupedInteger(block.itemsSubtotal)}
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  運費 NT${' '}
                  {formatShopGroupedInteger(block.effectiveShipping)}
                  {block.gapToFreeShipping != null &&
                  block.effectiveShipping > 0 ?
                    <span className="text-caption text-muted-foreground">
                      {' '}
                      （差 NT$
                      {formatShopGroupedInteger(block.gapToFreeShipping)} 享免運）
                    </span>
                  : block.effectiveShipping === 0 ?
                    <span className="text-caption text-[#2D6B4A]"> （已達免運）</span>
                  : null}
                </p>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );

  const checkoutFooter = (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border-hairline border-primary px-4 py-3">
        <div className="flex items-baseline justify-between gap-3 text-caption text-muted-foreground">
          <span>商品小計</span>
          <span className="tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(itemsSubtotal)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-caption text-muted-foreground">
          <span>運費合計</span>
          <span className="tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(shippingTotal)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t-hairline border-primary/30 pt-2">
          <span className="text-caption font-semibold text-primary">訂單總計</span>
          <span className="tabular-nums text-primary font-bold">
            NT$ {formatShopGroupedInteger(grandTotal)}
          </span>
        </div>
      </div>

      <div className="flex flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-w-0 flex-1"
          onClick={continueShopping}>
          繼續購物
        </Button>
        <Button
          type="button"
          className="min-w-0 flex-1"
          disabled={!validLines.length || hasLegacyLines}
          onClick={goCheckout}>
          前往結帳
        </Button>
      </div>
    </div>
  );

  if (layout === 'panel') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto hide-scrollbar [-webkit-overflow-scrolling:touch]">
          {vendorBlocks}
        </div>
        <div className="shrink-0 bg-[var(--color-background-primary)] pt-4">
          {checkoutFooter}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="min-h-0 flex-1">{vendorBlocks}</div>
      <div className="shrink-0 bg-[var(--color-background-primary)] pt-4">
        {checkoutFooter}
      </div>
    </div>
  );
}
