'use client';

import { maskCvsStoreNameForDisplay } from '@/lib/shop/mask-checkout-display';
import type { OrderLogisticsDraftView } from '@/lib/shop/order-logistics-snapshot';

export interface CheckoutCvsStoreSectionProps {
  draft: OrderLogisticsDraftView | null;
  isCod: boolean;
  selecting: boolean;
  onSelectStore: () => void;
}

export function CheckoutCvsStoreSection({
  draft,
  isCod,
  selecting,
  onSelectStore,
}: CheckoutCvsStoreSectionProps) {
  const storeName = (draft?.cvsStoreName ?? '').trim();
  const storeAddr = (draft?.cvsStoreAddress ?? '').trim();

  return (
    <section className="rounded-xl bg-[var(--color-background-primary)] px-4 py-4">
      <h2 className="text-heading-section text-foreground">取貨門市</h2>
      {storeName ? (
        <div className="mt-3 rounded-[10px] bg-[var(--shop-field-surface)] px-3 py-2.5">
          <p className="text-body text-foreground">
            {maskCvsStoreNameForDisplay(storeName)}
          </p>
          {storeAddr ? (
            <p className="mt-1 text-caption text-muted-foreground">{storeAddr}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-body text-muted-foreground">尚未選擇門市</p>
      )}
      <button
        type="button"
        disabled={selecting}
        className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-body font-medium text-primary-foreground disabled:opacity-50"
        onClick={onSelectStore}>
        {storeName ? '重新選擇門市' : '選擇取貨門市'}
      </button>
      {isCod ? (
        <p className="mt-2 text-caption text-muted-foreground">
          取貨付款：全額於超商代收，無需線上付款。
        </p>
      ) : null}
    </section>
  );
}
