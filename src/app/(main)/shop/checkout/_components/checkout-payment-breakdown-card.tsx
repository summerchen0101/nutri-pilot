'use client';

import { Package } from 'lucide-react';
import Image from 'next/image';
import { useId, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

import type { VendorShippingSummary } from '@/lib/shop/vendor-shipping';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface CheckoutPaymentBreakdownCardProps {
  summaries: VendorShippingSummary[];
  itemsSubtotal: number;
  shippingTotal: number;
  grandTotal: number;
}

export function CheckoutPaymentBreakdownCard({
  summaries,
  itemsSubtotal,
  shippingTotal,
  grandTotal,
}: CheckoutPaymentBreakdownCardProps) {
  const detailsId = useId();
  const [lineItemsOpen, setLineItemsOpen] = useState(false);

  return (
    <section className="rounded-xl bg-[var(--color-background-primary)] px-4 py-4">
      <h2 className="text-heading-section text-foreground">付款明細</h2>

      <div className="mt-3 space-y-2 pb-4 text-body">
        <div className="flex justify-between text-muted-foreground">
          <span>商品金額</span>
          <span className="tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(itemsSubtotal)}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>運費合計</span>
          <span className="tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(shippingTotal)}
          </span>
        </div>
        <div className="flex justify-between text-heading-section text-foreground">
          <span>總計</span>
          <span className="tabular-nums">
            NT$ {formatShopGroupedInteger(grandTotal)}
          </span>
        </div>
        <p className="text-caption text-muted-foreground">以新台幣（TWD）付款</p>
      </div>

      <button
        type="button"
        aria-expanded={lineItemsOpen}
        aria-controls={detailsId}
        onClick={() => setLineItemsOpen((o) => !o)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] border-hairline border-border bg-transparent px-3 py-2.5 text-body text-foreground transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
      >
        查看商品清單
        <FiChevronDown
          className={`h-[18px] w-[18px] shrink-0 transition-transform ${lineItemsOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <ul
        id={detailsId}
        hidden={!lineItemsOpen}
        className="mt-3 space-y-6 rounded-[10px] bg-[var(--shop-field-surface)] px-3 py-3"
      >
        {summaries.map((v) => (
          <li key={v.vendorId} className="space-y-2">
            <p className="text-caption font-medium text-foreground">
              {v.vendorName}
            </p>
            {v.selectedShippingMethodLabel ?
              <p className="mt-1 text-caption text-muted-foreground">
                運送：{v.selectedShippingMethodLabel}
              </p>
            : null}
            <ul className="mt-2 space-y-3">
              {v.lines.map((line) => (
                <li
                  key={line.variantId}
                  className="flex gap-2.5 text-body text-foreground"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--shop-field-surface)]">
                    {line.imageUrl ?
                      <Image
                        src={line.imageUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        sizes="48px"
                      />
                    : <div
                        className="flex h-full w-full items-center justify-center text-muted-foreground"
                        aria-hidden
                      >
                        <Package className="h-6 w-6" />
                      </div>
                    }
                  </div>
                  <span className="min-w-0 flex-1 leading-snug">
                    {line.productName} · {line.variantLabel} ×{' '}
                    {formatShopGroupedInteger(line.qty)}
                  </span>
                  <span className="shrink-0 self-start tabular-nums">
                    NT${' '}
                    {formatShopGroupedInteger(line.unitPrice * line.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-body text-muted-foreground">
              <span>小計</span>
              <span className="tabular-nums text-foreground">
                NT$ {formatShopGroupedInteger(v.itemsSubtotal)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap justify-between gap-2 text-body">
              <span className="text-muted-foreground">運費</span>
              <span className="tabular-nums text-foreground">
                NT$ {formatShopGroupedInteger(v.effectiveShipping)}
                {v.gapToFreeShipping != null && v.effectiveShipping > 0 ?
                  `（差 NT$${formatShopGroupedInteger(v.gapToFreeShipping)} 享免運）`
                : v.effectiveShipping === 0 ?
                  '（已達免運）'
                : null}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
