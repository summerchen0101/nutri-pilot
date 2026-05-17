"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FiChevronLeft } from "react-icons/fi";

import {
  getCheckoutShippingDefaults,
  startCheckout,
} from "@/app/(main)/shop/actions";
import { CheckoutLegalHint } from "@/app/(main)/shop/checkout/_components/checkout-legal-hint";
import { CheckoutPanelFooter } from "@/app/(main)/shop/checkout/_components/checkout-panel-footer";
import { CheckoutPaymentBreakdownCard } from "@/app/(main)/shop/checkout/_components/checkout-payment-breakdown-card";
import { CheckoutPaymentMethodCard } from "@/app/(main)/shop/checkout/_components/checkout-payment-method-card";
import { CheckoutRecipientFormCard } from "@/app/(main)/shop/checkout/_components/checkout-recipient-form-card";
import { CheckoutShippingSummaryCard } from "@/app/(main)/shop/checkout/_components/checkout-shipping-summary-card";
import { HEADER_LEADING_ICON_CLASS } from "@/components/layout/header-action-icon-styles";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/shop/cart-store";
import { submitNewebpayMpgForm } from "@/lib/shop/submit-newebpay-mpg-form";
import { useCartDerived } from "@/lib/shop/use-cart-derived";

export interface CheckoutClientProps {
  /** 供父層 `ShopRightSheet` 的 `elevatedHeader` 使用 */
  onBodyScrollTopChange?: (scrollTop: number) => void;
}

export function CheckoutClient({ onBodyScrollTopChange }: CheckoutClientProps) {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const isCheckoutPanelOpen = useCartStore((s) => s.isCheckoutPanelOpen);
  const closeCheckoutPanel = useCartStore((s) => s.closeCheckoutPanel);
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const vendorShippingSelections = useCartStore(
    (s) => s.vendorShippingSelections,
  );

  const {
    validLines,
    summaries,
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    hasLegacyLines,
  } = useCartDerived();

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddressFull, setRecipientAddressFull] = useState("");
  const [saveShippingToProfile, setSaveShippingToProfile] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      onBodyScrollTopChange?.(e.currentTarget.scrollTop);
    },
    [onBodyScrollTopChange],
  );

  useEffect(() => {
    if (!isCheckoutPanelOpen || lines.length === 0) return;

    let cancelled = false;
    setDefaultsLoading(true);
    void (async () => {
      const res = await getCheckoutShippingDefaults();
      if (cancelled) return;
      setDefaultsLoading(false);
      if (!res.ok) {
        if (res.reason === "unauthenticated") {
          closeCheckoutPanel();
          router.replace("/login");
          return;
        }
        closeCheckoutPanel();
        router.replace("/onboarding");
        return;
      }
      setRecipientName(res.defaultRecipientName);
      setRecipientPhone(res.defaultPhone);
      setRecipientAddressFull(res.defaultAddressFull);
    })();

    return () => {
      cancelled = true;
    };
  }, [isCheckoutPanelOpen, lines.length, closeCheckoutPanel, router]);

  useEffect(() => {
    if (!isCheckoutPanelOpen || lines.length > 0) return;
    closeCheckoutPanel();
    openCartPanel();
  }, [isCheckoutPanelOpen, lines.length, closeCheckoutPanel, openCartPanel]);

  const itemsPayload = validLines.map((l) => ({
    variantId: l.variantId,
    qty: l.qty,
  }));

  function goBackToCart() {
    closeCheckoutPanel();
    openCartPanel();
  }

  function pay() {
    setErr(null);
    if (!validLines.length) {
      setErr("購物車無有效品項，請重新加入商品");
      return;
    }
    const rn = recipientName.trim();
    const rp = recipientPhone.trim();
    const ra = recipientAddressFull.trim();
    if (!rn || !rp || !ra) {
      setErr("請填寫完整收件人姓名、電話與地址");
      return;
    }

    startTransition(async () => {
      const res = await startCheckout({
        items: itemsPayload,
        vendorShippingSelections,
        recipientName: rn,
        recipientPhone: rp,
        recipientAddressFull: ra,
        saveShippingToProfile,
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      if (res.paymentUrl && res.formFields) {
        closeCheckoutPanel();
        submitNewebpayMpgForm(res.paymentUrl, res.formFields);
      }
    });
  }

  if (lines.length === 0) {
    return null;
  }

  const canSubmit = validLines.length > 0 && !hasLegacyLines;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {defaultsLoading ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
          <p className="text-caption text-muted-foreground">載入收件資料…</p>
        </div>
      ) : (
        <>
          <div
            onScroll={onScroll}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-3 pb-4 [-webkit-overflow-scrolling:touch] hide-scrollbar">
            {hasLegacyLines ? (
              <p className="rounded-xl bg-[var(--color-background-primary)] px-3 py-2.5 text-body text-amber-900">
                購物車含有舊版資料，請先清空購物車後重新加入商品。
              </p>
            ) : null}

            <CheckoutShippingSummaryCard
              summaries={summaries}
              recipientName={recipientName}
              recipientPhone={recipientPhone}
              recipientAddressFull={recipientAddressFull}
              onChangeShipping={goBackToCart}
            />

            <CheckoutRecipientFormCard
              recipientName={recipientName}
              recipientPhone={recipientPhone}
              recipientAddressFull={recipientAddressFull}
              saveShippingToProfile={saveShippingToProfile}
              onRecipientNameChange={setRecipientName}
              onRecipientPhoneChange={setRecipientPhone}
              onRecipientAddressChange={setRecipientAddressFull}
              onSaveShippingToProfileChange={setSaveShippingToProfile}
            />

            <CheckoutPaymentMethodCard />

            <CheckoutPaymentBreakdownCard
              summaries={summaries}
              itemsSubtotal={itemsSubtotal}
              shippingTotal={shippingTotal}
              grandTotal={grandTotal}
            />

            <CheckoutLegalHint />

            {err ? (
              <p className="text-body text-[#E24B4A]" role="alert">
                {err}
              </p>
            ) : null}
          </div>

          <CheckoutPanelFooter
            grandTotal={grandTotal}
            pending={pending}
            canSubmit={canSubmit}
            onSubmit={pay}
          />
        </>
      )}
    </div>
  );
}

export function CheckoutPanelBackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      aria-label="返回購物車"
      className={HEADER_LEADING_ICON_CLASS}
      onClick={onBack}>
      <FiChevronLeft className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
