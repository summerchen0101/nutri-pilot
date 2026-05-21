"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { setEcpayCheckoutReturnError } from "@/lib/shop/ecpay-checkout-return-error";
import { setEcpayResumeOrderId } from "@/lib/shop/ecpay-checkout-resume";
import { subscribeEcpayReturnMessage } from "@/lib/shop/ecpay-payment-return-channel";
import { clearEcpayPaymentSessionOrderId } from "@/lib/shop/ecpay-payment-session";
import { useEcpayCheckoutFlowStore } from '@/lib/shop/ecpay-checkout-flow-store';
import { useCartStore } from "@/lib/shop/cart-store";
import { fetchOrderCheckoutVendorId } from '@/lib/shop/order-logistics-snapshot';
import { waitForLogisticsCreated } from '@/lib/shop/wait-for-logistics-created';
import { waitForOrderPaid } from "@/lib/shop/wait-for-order-paid";
import {
  logEcpayCheckout,
  snapshotSearchParams,
} from "@/lib/shop/ecpay-checkout-debug";

function buildSuccessQuery(
  orderId: string,
  merchantOrderNo: string,
  paymentPending: boolean,
  vendorId?: string | null,
): string {
  const params = new URLSearchParams();
  if (paymentPending) params.set("paymentPending", "1");
  params.set("order_id", orderId);
  if (merchantOrderNo) params.set("merchant_order_no", merchantOrderNo);
  if (vendorId) params.set("vendor_id", vendorId);
  return `?${params.toString()}`;
}

async function completePaidCheckoutToSuccess(
  orderId: string,
  merchantOrderNo: string,
  paymentPending: boolean,
): Promise<'success' | 'awaiting_logistics' | 'awaiting_payment' | 'pending_only'> {
  if (paymentPending) {
    return 'pending_only';
  }
  const vendorId = await fetchOrderCheckoutVendorId(orderId);
  if (!vendorId) {
    return 'pending_only';
  }
  const paid = await waitForOrderPaid(orderId, { timeoutMs: 60000 });
  if (paid.status !== 'paid') {
    return 'awaiting_payment';
  }

  const logistics = await waitForLogisticsCreated(orderId, vendorId, {
    timeoutMs: 90000,
  });
  if (!logistics.ok) {
    return 'awaiting_logistics';
  }
  useCartStore.getState().setLastCheckedOutVendorId(vendorId);
  return 'success';
}

export function ShopEcpayReturnHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const openCheckoutPanel = useCartStore((s) => s.openCheckoutPanel);
  const closeCheckoutPanel = useCartStore((s) => s.closeCheckoutPanel);
  const resetFlow = useEcpayCheckoutFlowStore((s) => s.resetFlow);
  const setPhase = useEcpayCheckoutFlowStore((s) => s.setPhase);
  const setStatusMessage = useEcpayCheckoutFlowStore((s) => s.setStatusMessage);
  const handledActionRef = useRef("");

  useEffect(() => {
    return subscribeEcpayReturnMessage(
      (path) => {
        logEcpayCheckout("postMessage router.assign", { path });
        window.location.assign(path);
      },
      { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL },
    );
  }, []);

  useEffect(() => {
    const paramsSnapshot = snapshotSearchParams(searchParams);
    logEcpayCheckout("Handler effect", { params: paramsSnapshot });

    if (searchParams.get("checkout") !== "1") {
      const hasAnyParam = Array.from(searchParams.keys()).length > 0;
      if (hasAnyParam) {
        logEcpayCheckout("Handler skip: checkout !== 1", { params: paramsSnapshot });
      }
      return;
    }

    const orderId = searchParams.get("orderId")?.trim() ?? "";
    if (!orderId) {
      logEcpayCheckout("Handler skip: missing orderId");
      return;
    }

    if (searchParams.get("paymentFailed") === "1") {
      const actionKey = `paymentFailed:${orderId}`;
      if (handledActionRef.current === actionKey) {
        logEcpayCheckout("Handler skip: paymentFailed already handled", {
          actionKey,
        });
        return;
      }
      handledActionRef.current = actionKey;

      logEcpayCheckout("Handler paymentFailed", { orderId });
      setEcpayCheckoutReturnError("付款未完成或已取消，請重試");
      clearEcpayPaymentSessionOrderId();
      resetFlow();
      openCheckoutPanel();
      router.replace("/shop");
      return;
    }

    if (searchParams.get("paymentDone") === "1") {
      const rtnCode = searchParams.get("rtnCode")?.trim() ?? "";
      const urlPaymentPending = searchParams.get("paymentPending") === "1";
      const actionKey = `paymentDone:${orderId}:${rtnCode}:${urlPaymentPending ? "1" : "0"}`;
      if (handledActionRef.current === actionKey) {
        logEcpayCheckout("Handler skip: paymentDone already handled", {
          actionKey,
        });
        return;
      }
      handledActionRef.current = actionKey;

      const urlMerchantOrderNo =
        searchParams.get("merchant_order_no")?.trim() ?? "";

      logEcpayCheckout("Handler paymentDone start", {
        orderId,
        rtnCode,
        urlPaymentPending,
        urlMerchantOrderNo,
      });

      void (async () => {
        closeCheckoutPanel();
        setPhase("polling");
        setStatusMessage("確認付款結果…");

        const goSuccess = async (
          merchantOrderNo: string,
          paymentPending: boolean,
        ) => {
          const vendorId = await fetchOrderCheckoutVendorId(orderId);
          const outcome = await completePaidCheckoutToSuccess(
            orderId,
            merchantOrderNo,
            paymentPending,
          );
          if (outcome === "awaiting_payment") {
            logEcpayCheckout("Handler → checkout (await payment)");
            setEcpayCheckoutReturnError(
              "付款結果確認中，請稍後再試或至訂單紀錄查看",
            );
            setEcpayResumeOrderId(orderId);
            resetFlow();
            openCheckoutPanel();
            router.replace("/shop");
            return;
          }
          if (outcome === "awaiting_logistics") {
            logEcpayCheckout("Handler → checkout (await logistics)");
            setEcpayCheckoutReturnError(
              "付款已完成，物流單建立中，請稍候…",
            );
            setEcpayResumeOrderId(orderId);
            resetFlow();
            openCheckoutPanel();
            router.replace("/shop");
            return;
          }
          clearEcpayPaymentSessionOrderId();
          resetFlow();
          window.location.assign(
            `/shop/success${buildSuccessQuery(orderId, merchantOrderNo, paymentPending, vendorId)}`,
          );
        };

        if (urlPaymentPending) {
          logEcpayCheckout("Handler → success (paymentPending)");
          await goSuccess(urlMerchantOrderNo, true);
          return;
        }

        if (rtnCode === "1") {
          logEcpayCheckout("Handler → success (rtnCode=1)");
          await goSuccess(urlMerchantOrderNo, false);
          return;
        }

        const result = await waitForOrderPaid(orderId);
        logEcpayCheckout("Handler waitForOrderPaid result", { ...result });

        const merchantOrderNo = result.merchantOrderNo ?? urlMerchantOrderNo;

        if (result.status === "paid") {
          logEcpayCheckout("Handler → success (poll paid)");
          await goSuccess(merchantOrderNo, false);
          return;
        }

        if (result.status === "pending_payment") {
          logEcpayCheckout("Handler → success (poll pending_payment)");
          await goSuccess(merchantOrderNo, true);
          return;
        }

        logEcpayCheckout("Handler → checkout panel (poll timeout/unknown)");
        setEcpayCheckoutReturnError(
          "付款結果確認中，請稍後再試或至訂單紀錄查看",
        );
        resetFlow();
        openCheckoutPanel();
        router.replace("/shop");
      })();
      return;
    }

    if (searchParams.get("logisticsDone") !== "1") {
      logEcpayCheckout("Handler skip: not logisticsDone/paymentDone/paymentFailed");
      return;
    }

    const actionKey = `logisticsDone:${orderId}`;
    if (handledActionRef.current === actionKey) {
      logEcpayCheckout("Handler skip: logisticsDone already handled", {
        actionKey,
      });
      return;
    }
    handledActionRef.current = actionKey;

    logEcpayCheckout("Handler logisticsDone", { orderId });
    setEcpayResumeOrderId(orderId);
    useEcpayCheckoutFlowStore.getState().signalMapReturn(orderId);
    openCheckoutPanel();
    router.replace("/shop");
  }, [
    closeCheckoutPanel,
    openCheckoutPanel,
    resetFlow,
    router,
    searchParams,
    setPhase,
    setStatusMessage,
  ]);

  return null;
}
