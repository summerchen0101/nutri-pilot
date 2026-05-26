"use client";

import type { VendorShippingSummary } from "@/lib/shop/vendor-shipping";
import { formatShopGroupedInteger } from "@/lib/shop/format-shop-number";
import {
  maskAddressForDisplay,
  maskCvsStoreNameForDisplay,
  maskPhoneForDisplay,
  maskRecipientNameForDisplay,
} from "@/lib/shop/mask-checkout-display";
import { isCvsShippingCode } from "@/lib/shop/shipping-method-kind";
export interface CheckoutShippingSummaryCardProps {
  summaries: VendorShippingSummary[];
  recipientName: string;
  recipientPhone: string;
  recipientAddressFull: string;
  cvsStoreNameByVendor: Record<string, string>;
  onChangeShipping?: () => void;
  onEditVendor: (vendorId: string) => void;
  onSelectCvsStore?: () => void;
  cvsStoreSelecting?: boolean;
  cvsStoreSelectDisabled?: boolean;
}

export function CheckoutShippingSummaryCard({
  summaries,
  recipientName,
  recipientPhone,
  recipientAddressFull,
  cvsStoreNameByVendor,
  onChangeShipping,
  onEditVendor,
  onSelectCvsStore,
  cvsStoreSelecting = false,
  cvsStoreSelectDisabled = false,
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
        {onChangeShipping ? (
          <button
            type="button"
            className="shrink-0 text-body font-medium text-[#378ADD] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
            onClick={onChangeShipping}>
            變更
          </button>
        ) : null}
      </div>

      <ul className="mt-3 space-y-0 divide-y-hairline divide-border">
        {summaries.map((v) => {
          const isCvs = isCvsShippingCode(v.selectedShippingMethodCode);
          const storeDisplay = (cvsStoreNameByVendor[v.vendorId] ?? "").trim();

          return (
            <li
              key={v.vendorId}
              className="space-y-2 py-4 first:pt-0 last:pb-0">
              <p className="text-caption font-medium text-foreground">
                {v.vendorName}
              </p>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="text-body text-foreground">
                  {v.selectedShippingMethodLabel ?? "運送方式"}
                </span>
                <span className="tabular-nums text-body text-foreground">
                  NT$ {formatShopGroupedInteger(v.effectiveShipping)}
                </span>
              </div>

              <div className="rounded-[10px] bg-[var(--shop-field-surface)] px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-caption text-muted-foreground">
                    {isCvs ? "取件資料" : "收件資料"}
                  </p>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
                    <button
                      type="button"
                      className="text-body font-medium text-[#378ADD] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
                      onClick={() => onEditVendor(v.vendorId)}>
                      編輯
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-1 text-body text-foreground">
                  <div>
                    <p className="text-caption text-muted-foreground">收件人</p>
                    <p>{maskRecipientNameForDisplay(recipientName)}</p>
                  </div>
                  <div>
                    <p className="mt-2 text-caption text-muted-foreground">
                      聯絡電話
                    </p>
                    <p className="tabular-nums">
                      {maskPhoneForDisplay(recipientPhone)}
                    </p>
                  </div>
                  {isCvs ? (
                    storeDisplay.length > 0 ? (
                      <div>
                        <p className="mt-2 text-caption text-muted-foreground">
                          門市名稱
                        </p>
                        <p className="break-words">
                          {maskCvsStoreNameForDisplay(storeDisplay)}
                        </p>
                        {onSelectCvsStore ? (
                          <button
                            type="button"
                            disabled={cvsStoreSelecting || cvsStoreSelectDisabled}
                            className="mt-2 text-body font-medium text-[#378ADD] disabled:opacity-50"
                            onClick={onSelectCvsStore}>
                            {cvsStoreSelecting ? "載入中…" : "重新選擇門市"}
                          </button>
                        ) : null}
                      </div>
                    ) : null
                  ) : (
                    <div>
                      <p className="mt-2 text-caption text-muted-foreground">
                        收件地址
                      </p>
                      <p className="break-words">
                        {maskAddressForDisplay(recipientAddressFull)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
