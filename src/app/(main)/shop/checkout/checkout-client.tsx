"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type UIEvent,
} from "react";
import { FiChevronLeft } from "react-icons/fi";

import {
  getCheckoutShippingDefaults,
} from "@/app/(main)/shop/actions";
import { CheckoutHomeDeliverySection } from "@/app/(main)/shop/checkout/_components/checkout-home-delivery-section";
import { CheckoutLegalHint } from "@/app/(main)/shop/checkout/_components/checkout-legal-hint";
import { CheckoutPanelFooter } from "@/app/(main)/shop/checkout/_components/checkout-panel-footer";
import { CheckoutPaymentBreakdownCard } from "@/app/(main)/shop/checkout/_components/checkout-payment-breakdown-card";
import { CheckoutPaymentMethodCard } from "@/app/(main)/shop/checkout/_components/checkout-payment-method-card";
import { CheckoutShippingSummaryCard } from "@/app/(main)/shop/checkout/_components/checkout-shipping-summary-card";
import { CheckoutVendorRecipientEditSheet } from "@/app/(main)/shop/checkout/_components/checkout-vendor-recipient-edit-sheet";
import { HEADER_LEADING_ICON_CLASS } from "@/components/layout/header-action-icon-styles";
import { useCartStore } from "@/lib/shop/cart-store";
import { consumeEcpayCheckoutReturnError } from "@/lib/shop/ecpay-checkout-return-error";
import { consumeEcpayResumeOrderId } from "@/lib/shop/ecpay-checkout-resume";
import { logEcpayCheckout } from "@/lib/shop/ecpay-checkout-debug";
import { useCartDerived } from "@/lib/shop/use-cart-derived";
import { useSingleVendorCheckoutFlow } from "@/lib/shop/use-single-vendor-checkout-flow";
import { isCvsCodShippingCode } from "@/lib/shop/shipping-method-kind";
import { validateEcpayRecipientName } from "@/lib/shop/validate-ecpay-recipient-name";

export interface CheckoutClientProps {
  onBodyScrollTopChange?: (scrollTop: number) => void;
}

export function CheckoutClient({ onBodyScrollTopChange }: CheckoutClientProps) {
  const router = useRouter();
  const checkoutVendorId = useCartStore((s) => s.checkoutVendorId);
  const setLastCheckedOutVendorId = useCartStore(
    (s) => s.setLastCheckedOutVendorId,
  );
  const isCheckoutPanelOpen = useCartStore((s) => s.isCheckoutPanelOpen);
  const closeCheckoutPanel = useCartStore((s) => s.closeCheckoutPanel);
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const vendorShippingSelections = useCartStore(
    (s) => s.vendorShippingSelections,
  );

  const {
    selectedValidLines,
    selectedSummary,
    summaries,
    selectedItemsSubtotal,
    selectedShippingTotal,
    selectedGrandTotal,
    hasLegacyLines,
  } = useCartDerived();

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddressFull, setRecipientAddressFull] = useState("");
  const [saveShippingToProfile, setSaveShippingToProfile] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [defaultsReady, setDefaultsReady] = useState(false);
  const [resumeOrderId, setResumeOrderId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const displaySummaries = useMemo(
    () => (selectedSummary ? [selectedSummary] : []),
    [selectedSummary],
  );

  const editingSummary = useMemo(() => {
    if (!editingVendorId) return null;
    return summaries.find((s) => s.vendorId === editingVendorId) ?? null;
  }, [editingVendorId, summaries]);

  const onScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      onBodyScrollTopChange?.(e.currentTarget.scrollTop);
    },
    [onBodyScrollTopChange],
  );

  const handleComplete = useCallback(
    (orderId: string) => {
      const vid = checkoutVendorId ?? "";
      logEcpayCheckout("CheckoutClient complete → success", { orderId, vid });
      if (vid) setLastCheckedOutVendorId(vid);
      closeCheckoutPanel();
      const q = new URLSearchParams({ order_id: orderId });
      if (vid) q.set("vendor_id", vid);
      router.push(`/shop/success?${q.toString()}`);
      router.refresh();
    },
    [checkoutVendorId, closeCheckoutPanel, router, setLastCheckedOutVendorId],
  );

  const flow = useSingleVendorCheckoutFlow({
    checkoutVendorId,
    selectedSummary,
    selectedValidLines,
    vendorShippingSelections,
    recipientName,
    recipientPhone,
    recipientAddressFull,
    saveShippingToProfile,
    isPanelOpen: isCheckoutPanelOpen,
    recipientDefaultsReady: defaultsReady,
    resumeOrderId,
    onComplete: handleComplete,
    onError: setErr,
  });

  const handleSelectCvsStore = useCallback(() => {
    void (async () => {
      setErr(null);
      const ok = await flow.ensureOrder();
      if (ok) void flow.openStoreMap();
    })();
  }, [flow]);

  useEffect(() => {
    if (!isCheckoutPanelOpen) {
      setResumeOrderId(null);
      return;
    }
    const returnErr = consumeEcpayCheckoutReturnError();
    if (returnErr) setErr(returnErr);
    const resume = consumeEcpayResumeOrderId();
    if (resume) setResumeOrderId(resume);
  }, [isCheckoutPanelOpen]);

  useEffect(() => {
    if (!isCheckoutPanelOpen) {
      setDefaultsReady(false);
      return;
    }
    if (selectedValidLines.length === 0) return;

    let cancelled = false;
    setDefaultsLoading(true);
    setDefaultsReady(false);
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
      setDefaultsReady(true);
      setErr((prev) =>
        prev === "請填寫收件人姓名與聯絡電話" ? null : prev,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isCheckoutPanelOpen,
    selectedValidLines.length,
    closeCheckoutPanel,
    router,
  ]);

  useEffect(() => {
    if (!isCheckoutPanelOpen || selectedValidLines.length > 0) return;
    closeCheckoutPanel();
    openCartPanel();
  }, [
    isCheckoutPanelOpen,
    selectedValidLines.length,
    closeCheckoutPanel,
    openCartPanel,
  ]);

  function goBackToCart() {
    closeCheckoutPanel();
    openCartPanel();
  }

  function handleFooterSubmit() {
    startTransition(() => {
      void (async () => {
        setErr(null);
        if (!defaultsReady) return;

        const rn = recipientName.trim();
        const rp = recipientPhone.trim();
        if (!rn || !rp) {
          setErr("請填寫收件人姓名與聯絡電話");
          return;
        }
        const nameErr = validateEcpayRecipientName(rn);
        if (nameErr) {
          setErr(nameErr);
          return;
        }

        if (!flow.orderId) {
          const created = await flow.ensureOrder();
          if (!created) return;
        }

        if (flow.isCod) {
          if (!flow.storeReady) {
            void flow.openStoreMap();
          }
          return;
        }

        if (flow.isCvs) {
          if (!flow.storeReady) {
            void flow.openStoreMap();
            return;
          }
          await flow.goToPayment();
          return;
        }

        if (flow.isHome) {
          await flow.confirmHomeAndPay();
          return;
        }

        setErr("無法判斷運送方式");
      })();
    });
  }

  if (!checkoutVendorId || selectedValidLines.length === 0) {
    return null;
  }

  const recipientFilled =
    defaultsReady &&
    recipientName.trim().length > 0 &&
    recipientPhone.trim().length > 0;

  const loading =
    defaultsLoading ||
    !defaultsReady ||
    flow.phase === "loading" ||
    flow.phase === "confirmingHome" ||
    flow.phase === "paying" ||
    flow.phase === "awaitingLogistics";

  const footerLabel = (() => {
    if (flow.isCod) {
      return flow.storeReady ? "完成（物流建立中）" : "選擇取貨門市";
    }
    if (flow.isCvs) {
      return flow.storeReady ? "前往付款" : "選擇取貨門市";
    }
    if (flow.isHome) {
      return "確認地址並前往付款";
    }
    return "送出";
  })();

  const homeAddressFilled = recipientAddressFull.trim().length > 0;

  const footerCanSubmit = (() => {
    if (
      hasLegacyLines ||
      !recipientFilled ||
      flow.phase === "awaitingLogistics" ||
      flow.phase === "loading" ||
      flow.phase === "selectingStore"
    ) {
      return false;
    }
    if (flow.isCod) return !flow.storeReady;
    if (flow.isCvs) return true;
    if (flow.isHome) return homeAddressFilled;
    return false;
  })();

  const cvsStoreNames: Record<string, string> = {};
  if (checkoutVendorId && flow.draft?.cvsStoreName) {
    cvsStoreNames[checkoutVendorId] = flow.draft.cvsStoreName;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CheckoutVendorRecipientEditSheet
        open={editingSummary != null}
        summary={editingSummary}
        recipientName={recipientName}
        recipientPhone={recipientPhone}
        recipientAddressFull={recipientAddressFull}
        saveShippingToProfile={saveShippingToProfile}
        cvsStoreNameByVendor={cvsStoreNames}
        onClose={() => setEditingVendorId(null)}
        onSave={(patch) => {
          setRecipientName(patch.recipientName);
          setRecipientPhone(patch.recipientPhone);
          setRecipientAddressFull(patch.recipientAddressFull);
          setSaveShippingToProfile(patch.saveShippingToProfile);
        }}
      />

      {defaultsLoading ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
          <p className="text-caption text-muted-foreground">載入結帳資料…</p>
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
              summaries={displaySummaries}
              recipientName={recipientName}
              recipientPhone={recipientPhone}
              recipientAddressFull={recipientAddressFull}
              cvsStoreNameByVendor={cvsStoreNames}
              onChangeShipping={goBackToCart}
              onEditVendor={(vendorId) => setEditingVendorId(vendorId)}
              onSelectCvsStore={flow.isCvs ? handleSelectCvsStore : undefined}
              cvsStoreSelecting={flow.phase === "selectingStore"}
              cvsStoreSelectDisabled={
                !defaultsReady ||
                flow.phase === "loading" ||
                !recipientFilled
              }
            />

            {flow.isHome ? (
              <CheckoutHomeDeliverySection
                homeSubType={flow.homeSubType}
                onHomeSubTypeChange={flow.setHomeSubType}
                recipientAddressFull={recipientAddressFull}
                onAddressSelected={(addr) => setRecipientAddressFull(addr)}
              />
            ) : null}

            {!flow.isHome ? (
              <CheckoutPaymentMethodCard
                isCod={isCvsCodShippingCode(
                  selectedSummary?.selectedShippingMethodCode ?? null,
                )}
              />
            ) : null}

            <CheckoutPaymentBreakdownCard
              summaries={displaySummaries}
              itemsSubtotal={selectedItemsSubtotal}
              shippingTotal={selectedShippingTotal}
              grandTotal={selectedGrandTotal}
            />

            <CheckoutLegalHint />

            {flow.statusMessage ? (
              <p className="text-body text-muted-foreground" role="status">
                {flow.statusMessage}
              </p>
            ) : null}

            {err ? (
              <p className="text-body text-[#E24B4A]" role="alert">
                {err}
              </p>
            ) : null}
          </div>

          <CheckoutPanelFooter
            grandTotal={selectedGrandTotal}
            pending={loading}
            canSubmit={footerCanSubmit}
            submitLabel={footerLabel}
            onSubmit={handleFooterSubmit}
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
