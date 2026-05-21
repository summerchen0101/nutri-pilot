'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

import { ContinueOrderPaymentButton } from '@/app/(main)/settings/orders/_components/continue-order-payment-button';
import { OrderBuyAgainButton } from '@/app/(main)/settings/orders/_components/order-buy-again-button';
import { OrderListLineRow } from '@/app/(main)/settings/orders/_components/order-list-line-row';
import { MemberOrderStatusTag } from '@/app/(main)/settings/_components/member-order-status-tag';
import type { MemberOrderPaymentBreakdown } from '@/lib/shop/build-member-order-payment-breakdown';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

export interface OrderListItemCardProps {
  orderId: string;
  createdAtLabel: string;
  status: string;
  breakdown: MemberOrderPaymentBreakdown;
  showContinuePayment: boolean;
}

export function OrderListItemCard({
  orderId,
  createdAtLabel,
  status,
  breakdown,
  showContinuePayment,
}: OrderListItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const vendor = breakdown.vendors[0];
  const lines = vendor?.lines ?? [];
  const hiddenCount = Math.max(0, lines.length - 1);
  const visibleLines = expanded ? lines : lines.slice(0, 1);

  return (
    <div className="rounded-xl border-hairline border-border bg-card">
      <Link
        href={`/settings/orders/${orderId}`}
        className="block px-3 py-3 transition-colors hover:border-[#4C956C]/40"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-caption font-medium text-foreground">
            {vendor?.vendorName ?? '商品'}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-caption text-muted-foreground">{createdAtLabel}</span>
            <MemberOrderStatusTag status={status} />
          </div>
        </div>

        {visibleLines.length > 0 ?
          <ul className="mt-3 space-y-3">
            {visibleLines.map((line) => (
              <li key={line.id}>
                <OrderListLineRow line={line} />
              </li>
            ))}
          </ul>
        : null}

        {hiddenCount > 0 ?
          <button
            type="button"
            aria-expanded={expanded}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setExpanded((open) => !open);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border-hairline border-border bg-transparent px-3 py-2 text-body text-foreground transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
          >
            {expanded ? '收合商品' : `檢視其他商品（${hiddenCount}）`}
            <FiChevronDown
              className={`h-[18px] w-[18px] shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        : null}

        <div className="mt-3 flex items-center justify-between gap-2 border-t-hairline border-border pt-3">
          <span className="text-caption text-muted-foreground">訂單金額</span>
          <span className="text-body font-medium tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(breakdown.grandTotal)}
          </span>
        </div>
      </Link>

      <div
        className="flex flex-wrap items-start gap-3 border-t-hairline border-border px-3 py-3"
        onClick={(event) => event.stopPropagation()}
      >
        <OrderBuyAgainButton orderId={orderId} />
        {showContinuePayment ?
          <ContinueOrderPaymentButton orderId={orderId} />
        : null}
      </div>
    </div>
  );
}
