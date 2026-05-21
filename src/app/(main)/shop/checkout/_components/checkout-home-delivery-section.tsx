'use client';

import { useState } from 'react';

import { CheckoutAddressPickerSheet } from '@/app/(main)/shop/checkout/_components/checkout-address-picker-sheet';
import { maskAddressForDisplay } from '@/lib/shop/mask-checkout-display';

export interface CheckoutHomeDeliverySectionProps {
  homeSubType: 'TCAT' | 'POST';
  onHomeSubTypeChange: (value: 'TCAT' | 'POST') => void;
  recipientAddressFull: string;
  onAddressSelected: (addressFull: string) => void;
  confirming: boolean;
  onConfirmHome: () => void;
}

export function CheckoutHomeDeliverySection({
  homeSubType,
  onHomeSubTypeChange,
  recipientAddressFull,
  onAddressSelected,
  confirming,
  onConfirmHome,
}: CheckoutHomeDeliverySectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const addr = recipientAddressFull.trim();

  return (
    <>
      <CheckoutAddressPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(row) => {
          onAddressSelected(row.address_full);
          setPickerOpen(false);
        }}
      />

      <section className="rounded-xl bg-[var(--color-background-primary)] px-4 py-4">
        <h2 className="text-heading-section text-foreground">宅配</h2>

        <p className="mt-3 text-caption text-muted-foreground">宅配商</p>
        <div className="mt-2 flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-body">
            <input
              type="radio"
              name="homeSubType"
              checked={homeSubType === 'TCAT'}
              onChange={() => onHomeSubTypeChange('TCAT')}
            />
            黑貓 TCAT
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-body">
            <input
              type="radio"
              name="homeSubType"
              checked={homeSubType === 'POST'}
              onChange={() => onHomeSubTypeChange('POST')}
            />
            郵局 POST
          </label>
        </div>

        <p className="mt-4 text-caption text-muted-foreground">收件地址</p>
        {addr ? (
          <p className="mt-1 text-body text-foreground">
            {maskAddressForDisplay(addr)}
          </p>
        ) : (
          <p className="mt-1 text-body text-muted-foreground">請選擇或填寫地址</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-body font-medium text-[#378ADD]"
            onClick={() => setPickerOpen(true)}>
            重選地址
          </button>
        </div>

        <button
          type="button"
          disabled={!addr || confirming}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-body font-medium text-primary-foreground disabled:opacity-50"
          onClick={onConfirmHome}>
          {confirming ? '處理中…' : '確認地址並前往付款'}
        </button>
      </section>
    </>
  );
}
