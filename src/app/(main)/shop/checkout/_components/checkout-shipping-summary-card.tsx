'use client';

import type { VendorShippingSummary } from '@/lib/shop/vendor-shipping';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import {
  maskAddressForDisplay,
  maskPhoneForDisplay,
  maskRecipientNameForDisplay,
} from '@/lib/shop/mask-checkout-display';

export interface CheckoutShippingSummaryCardProps {
  summaries: VendorShippingSummary[];
  recipientName: string;
  recipientPhone: string;
  recipientAddressFull: string;
  onChangeShipping: () => void;
}

export function CheckoutShippingSummaryCard({
  summaries,
  recipientName,
  recipientPhone,
  recipientAddressFull,
  onChangeShipping,
}: CheckoutShippingSummaryCardProps) {
  return (
    <section className="rounded-xl bg-[var(--color-background-primary)] px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-heading-section text-foreground">
          運送方式
          <span className="ml-0.5 text-[#E24B4A]" aria-hidden>
            *
          </span>
        </h2>
        <button
          type="button"
          className="shrink-0 text-body font-medium text-[#378ADD] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
          onClick={onChangeShipping}
        >
          變更
        </button>
      </div>

      <ul className="mt-3 space-y-3">
        {summaries.map((v) => (
          <li key={v.vendorId}>
            <p className="text-caption font-medium text-foreground">
              {v.vendorName}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <span className="text-body text-foreground">
                {v.selectedShippingMethodLabel ?? '運送方式'}
              </span>
              <span className="tabular-nums text-body text-foreground">
                NT${' '}
                {formatShopGroupedInteger(v.effectiveShipping)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1 pt-3 text-body text-foreground">
        <p className="text-caption text-muted-foreground">收件人</p>
        <p>{maskRecipientNameForDisplay(recipientName)}</p>
        <p className="mt-2 text-caption text-muted-foreground">聯絡電話</p>
        <p className="tabular-nums">{maskPhoneForDisplay(recipientPhone)}</p>
        <p className="mt-2 text-caption text-muted-foreground">收件地址</p>
        <p className="break-words">{maskAddressForDisplay(recipientAddressFull)}</p>
      </div>
    </section>
  );
}
