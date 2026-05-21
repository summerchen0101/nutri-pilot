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
  startCheckout,
} from "@/app/(main)/shop/actions";
import { CheckoutLegalHint } from "@/app/(main)/shop/checkout/_components/checkout-legal-hint";
import { CheckoutPanelFooter } from "@/app/(main)/shop/checkout/_components/checkout-panel-footer";
import { CheckoutPaymentBreakdownCard } from "@/app/(main)/shop/checkout/_components/checkout-payment-breakdown-card";
import { CheckoutPaymentMethodCard } from "@/app/(main)/shop/checkout/_components/checkout-payment-method-card";
import { CheckoutShippingSummaryCard } from "@/app/(main)/shop/checkout/_components/checkout-shipping-summary-card";
import { CheckoutVendorRecipientEditSheet } from "@/app/(main)/shop/checkout/_components/checkout-vendor-recipient-edit-sheet";
import { HEADER_LEADING_ICON_CLASS } from "@/components/layout/header-action-icon-styles";
import { useCartStore } from "@/lib/shop/cart-store";
import { isCvsShippingCode } from "@/lib/shop/shipping-method-kind";
import { consumeEcpayCheckoutReturnError } from "@/lib/shop/ecpay-checkout-return-error";
import { consumeEcpayResumeOrderId } from "@/lib/shop/ecpay-checkout-resume";
import {
  ECPAY_LOGISTICS_POPUP_NAME,
  openEcpayPopup,
  showPopupMessage,
} from "@/lib/shop/ecpay-popup-form";
import { useEcpayCheckoutFlow } from "@/lib/shop/use-ecpay-checkout-flow";
import { validateEcpayRecipientName } from "@/lib/shop/validate-ecpay-recipient-name";
import { logEcpayCheckout } from "@/lib/shop/ecpay-checkout-debug";
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
  const [cvsStoreNameByVendor, setCvsStoreNameByVendor] = useState<
    Record<string, string>
  >({});
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  const {
    phase,
    statusMessage,
    pendingPaymentOrderId,
    startEcpayFlow,
    resumeEcpayCheckout,
    openPayment,
  } = useEcpayCheckoutFlow({
    onPaid: (orderId) => {
      logEcpayCheckout("CheckoutClient onPaid → /shop/success", { orderId });
      closeCheckoutPanel();
      router.push("/shop/success");
      router.refresh();
    },
    onPendingPayment: (orderId) => {
      logEcpayCheckout("CheckoutClient onPendingPayment → success", {
        orderId,
      });
      closeCheckoutPanel();
      router.push(`/shop/success?paymentPending=1&order_id=${orderId}`);
    },
    onError: (message) => {
      logEcpayCheckout("CheckoutClient onError", { message });
      setErr(message);
    },
  });
  const [err, setErr] = useState<string | null>(null);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [pending, startTransition] = useTransition();

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

  useEffect(() => {
    if (!isCheckoutPanelOpen) return;
    const returnErr = consumeEcpayCheckoutReturnError();
    if (returnErr) setErr(returnErr);
  }, [isCheckoutPanelOpen]);

  useEffect(() => {
    if (!isCheckoutPanelOpen) return;
    const resumeOrderId = consumeEcpayResumeOrderId();
    if (!resumeOrderId) return;
    void resumeEcpayCheckout(resumeOrderId);
  }, [isCheckoutPanelOpen, resumeEcpayCheckout]);

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

  useEffect(() => {
    setCvsStoreNameByVendor((prev) => {
      const cvsIds = new Set(
        summaries
          .filter((s) => isCvsShippingCode(s.selectedShippingMethodCode))
          .map((s) => s.vendorId),
      );
      const next: Record<string, string> = {};
      cvsIds.forEach((id) => {
        next[id] = prev[id] ?? "";
      });
      return next;
    });
  }, [summaries]);

  const itemsPayload = validLines.map((l) => ({
    variantId: l.variantId,
    qty: l.qty,
  }));

  function goBackToCart() {
    closeCheckoutPanel();
    openCartPanel();
  }

  function confirmPayment() {
    const orderId = pendingPaymentOrderId?.trim() ?? "";
    if (!orderId) {
      setErr("找不到訂單，請重新送出");
      return;
    }
    setErr(null);
    void openPayment(orderId);
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
    if (!rn || !rp) {
      setErr("請填寫收件人姓名與聯絡電話");
      return;
    }

    const nameErr = validateEcpayRecipientName(rn);
    if (nameErr) {
      setErr(nameErr);
      return;
    }

    let anyNeedsAddress = false;
    for (const s of summaries) {
      if (!isCvsShippingCode(s.selectedShippingMethodCode)) {
        anyNeedsAddress = true;
      }
    }
    if (anyNeedsAddress && !ra) {
      setErr("請填寫收件地址（訂單含宅配運送）");
      return;
    }

    const logisticsPopup = openEcpayPopup(ECPAY_LOGISTICS_POPUP_NAME);
    if (!logisticsPopup) {
      setErr("請允許彈出視窗以完成物流設定");
      return;
    }
    showPopupMessage(logisticsPopup, "正在建立訂單…");

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
        try {
          logisticsPopup.close();
        } catch {
          /* ignore */
        }
        setErr(res.error);
        return;
      }
      if (res.orderId && res.logisticsQueue) {
        await startEcpayFlow(res.orderId, res.logisticsQueue, logisticsPopup);
      } else {
        try {
          logisticsPopup.close();
        } catch {
          /* ignore */
        }
        setErr("建單回傳缺少參數");
      }
    });
  }

  if (lines.length === 0) {
    return null;
  }

  const canSubmit = validLines.length > 0 && !hasLegacyLines;
  const isPaymentReady = phase === "paymentReady";
  const footerPending =
    pending ||
    phase === "logistics" ||
    phase === "payment" ||
    phase === "polling";
  const footerCanSubmit = isPaymentReady
    ? Boolean(pendingPaymentOrderId)
    : canSubmit && phase === "idle";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CheckoutVendorRecipientEditSheet
        open={editingSummary != null}
        summary={editingSummary}
        recipientName={recipientName}
        recipientPhone={recipientPhone}
        recipientAddressFull={recipientAddressFull}
        saveShippingToProfile={saveShippingToProfile}
        cvsStoreNameByVendor={cvsStoreNameByVendor}
        onClose={() => setEditingVendorId(null)}
        onSave={(patch) => {
          setRecipientName(patch.recipientName);
          setRecipientPhone(patch.recipientPhone);
          setRecipientAddressFull(patch.recipientAddressFull);
          setSaveShippingToProfile(patch.saveShippingToProfile);
          setCvsStoreNameByVendor((prev) => ({
            ...prev,
            [patch.vendorId]: patch.cvsStoreName,
          }));
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
              summaries={summaries}
              recipientName={recipientName}
              recipientPhone={recipientPhone}
              recipientAddressFull={recipientAddressFull}
              cvsStoreNameByVendor={cvsStoreNameByVendor}
              onChangeShipping={goBackToCart}
              onEditVendor={(vendorId) => setEditingVendorId(vendorId)}
            />

            <CheckoutPaymentMethodCard />

            <CheckoutPaymentBreakdownCard
              summaries={summaries}
              itemsSubtotal={itemsSubtotal}
              shippingTotal={shippingTotal}
              grandTotal={grandTotal}
            />

            <CheckoutLegalHint />

            {statusMessage ? (
              <p className="text-body text-muted-foreground" role="status">
                {statusMessage}
              </p>
            ) : null}

            {err ? (
              <p className="text-body text-[#E24B4A]" role="alert">
                {err}
              </p>
            ) : null}
          </div>

          <CheckoutPanelFooter
            grandTotal={grandTotal}
            pending={footerPending}
            canSubmit={footerCanSubmit}
            submitLabel={isPaymentReady ? "前往付款" : "送出訂單"}
            onSubmit={isPaymentReady ? confirmPayment : pay}
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
