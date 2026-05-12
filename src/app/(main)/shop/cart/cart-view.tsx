'use client';

import { Store, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { CartLineRow } from '@/app/(main)/shop/cart/cart-line-row';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useCartStore } from '@/lib/shop/cart-store';
import { useCartDerived } from '@/lib/shop/use-cart-derived';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface CartViewProps {
  /** `panel`：側欄内列表捲動，預估總計與按鈕固定於底部 */
  layout?: 'page' | 'panel';
  /** 與 `layout="page"` 併用：只渲染廠商列表，供全頁固定底欄 */
  embedded?: boolean;
}

export function CartView({ layout = 'page', embedded = false }: CartViewProps) {
  const router = useRouter();
  const setQty = useCartStore((s) => s.setQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);

  const {
    lines,
    validLines,
    summaries,
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    hasLegacyLines,
  } = useCartDerived();

  const maxLeadTimeDays = useMemo(() => {
    if (validLines.length === 0) return 0;
    return Math.max(...validLines.map((l) => l.leadTimeDays));
  }, [validLines]);

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
    if (embedded) return null;
    return empty;
  }

  function handleQuantityChange(variantId: string, nextQty: number) {
    setQty(variantId, nextQty);
  }

  const vendorBlocks = (
    <div className="space-y-6">
      {hasLegacyLines ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body text-amber-900">
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

          <ul className="divide-y-hairline divide-border px-3">
            {block.lines.map((line) => (
              <li key={line.variantId}>
                <CartLineRow
                  line={line}
                  onQuantityChange={handleQuantityChange}
                  onRemove={removeLine}
                />
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t-hairline border-border bg-muted/30 px-3 py-3">
            <div className="flex items-start gap-2 text-body text-muted-foreground">
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

  const shipNote =
    maxLeadTimeDays > 0 ?
      `約 ${maxLeadTimeDays} 個工作天起由廠商準備出貨`
    : '出貨將於結帳後確認';

  const checkoutFooter = (
    <div className="space-y-3">
      <p className="bg-[#1E212B] px-3 py-2 text-center text-caption text-white/95">
        {shipNote}
      </p>
      <div className="space-y-2 rounded-xl border-hairline border-border px-3 py-3">
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
        <div className="flex items-baseline justify-between gap-3 border-t-hairline border-border pt-2">
          <span className="text-caption font-medium text-primary">訂單總計</span>
          <span className="tabular-nums text-primary font-medium">
            NT$ {formatShopGroupedInteger(grandTotal)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="w-full"
          disabled={!validLines.length || hasLegacyLines}
          onClick={goCheckout}>
          繼續結帳
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={continueShopping}>
          繼續購物
        </Button>
      </div>
    </div>
  );

  if (layout === 'page' && embedded) {
    return vendorBlocks;
  }

  if (layout === 'panel') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto hide-scrollbar [-webkit-overflow-scrolling:touch]">
          {vendorBlocks}
        </div>
        <div className="shrink-0 border-t-hairline border-border bg-[var(--color-background-primary)] pt-3">
          {checkoutFooter}
        </div>
      </div>
    );
  }

  return null;
}
