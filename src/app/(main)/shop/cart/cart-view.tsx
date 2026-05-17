'use client';

import { Store, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { CartCheckoutDock } from '@/app/(main)/shop/cart/cart-checkout-dock';
import { CartCommerceSections } from '@/app/(main)/shop/cart/cart-commerce-sections';
import { CartLineRow } from '@/app/(main)/shop/cart/cart-line-row';
import { CartVendorShippingPicker } from '@/app/(main)/shop/cart/cart-vendor-shipping-picker';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useCartDerived } from '@/lib/shop/use-cart-derived';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface CartViewProps {
  /** 列表 `scrollTop` 供側欄標題列升起態 */
  onPanelScrollTopChange?: (scrollTop: number) => void;
}

export function CartView({ onPanelScrollTopChange }: CartViewProps) {
  const router = useRouter();
  const setQty = useCartStore((s) => s.setQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);
  const setVendorShippingSelection = useCartStore(
    (s) => s.setVendorShippingSelection,
  );
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);

  const {
    lines,
    summaries,
    hasLegacyLines,
    shippingMethodsLoading,
    shippingMethodsFailed,
    vendorShippingSelections,
  } = useCartDerived();

  if (lines.length === 0) {
    const empty = (
      <EmptyState
        message="購物車是空的"
        actionHref="/shop"
        actionLabel="前往商城"
        onActionNavigate={closeCartPanel}
      />
    );
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pt-3 pb-6 hide-scrollbar [-webkit-overflow-scrolling:touch]"
          onScroll={(e) => {
            onPanelScrollTopChange?.(e.currentTarget.scrollTop);
          }}
        >
          {empty}
        </div>
      </div>
    );
  }

  function handleQuantityChange(variantId: string, nextQty: number) {
    setQty(variantId, nextQty);
  }

  const vendorsAndLines = (
    <div className="space-y-8">
      {hasLegacyLines ? (
        <div className="flex flex-col gap-3 rounded-xl bg-[var(--color-background-primary)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
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
        <div key={block.vendorId} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Store className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <h2 className="min-w-0 flex-1 text-heading-section text-foreground">
              {block.vendorName}
            </h2>
          </div>

          {block.lines.map((line) => (
            <div
              key={line.variantId}
              className="overflow-hidden rounded-xl bg-[var(--color-background-primary)] px-3">
              <CartLineRow
                line={line}
                onQuantityChange={handleQuantityChange}
                onRemove={removeLine}
              />
            </div>
          ))}

          <div className="space-y-3 rounded-xl bg-[var(--color-background-primary)] px-3 py-3">
            <div className="flex items-start gap-2 text-body text-muted-foreground">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-heading-card text-foreground">配送與運費</p>
                <p className="text-caption">
                  與全單相同收件地址；可於結帳時或
                  <Link
                    href="/settings"
                    className="mx-0.5 font-medium text-primary underline-offset-2 hover:underline"
                    onClick={closeCartPanel}>
                    設定
                  </Link>
                  編輯預設資料。
                </p>
                {shippingMethodsLoading ?
                  <p className="text-caption text-muted-foreground">
                    載入運送方式…
                  </p>
                : null}
                {shippingMethodsFailed ?
                  <p className="text-caption text-[#E24B4A]">
                    無法載入運送選項，已暫以商品加入時快照計算運費。
                  </p>
                : null}
                <CartVendorShippingPicker
                  ariaLabelSuffix={block.vendorName}
                  methods={block.availableShippingMethods}
                  selectedMethodId={
                    vendorShippingSelections[block.vendorId] ?? null
                  }
                  itemsSubtotalRounded={block.itemsSubtotal}
                  onSelectMethodId={(id) => {
                    setVendorShippingSelection(block.vendorId, id);
                  }}
                />
                <p className="pt-2 tabular-nums text-body text-foreground">
                  商品小計 NT${' '}
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
                    <span className="text-caption text-[#2D6B4A]">
                      {' '}
                      （已達免運）
                    </span>
                  : null}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const scrollBlock = (
    <>
      {vendorsAndLines}
      <CartCommerceSections className="mt-6" />
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 hide-scrollbar [-webkit-overflow-scrolling:touch]"
        onScroll={(e) => {
          onPanelScrollTopChange?.(e.currentTarget.scrollTop);
        }}
      >
        {scrollBlock}
        <div className="pb-6" aria-hidden />
      </div>
      <CartCheckoutDock />
    </div>
  );
}
