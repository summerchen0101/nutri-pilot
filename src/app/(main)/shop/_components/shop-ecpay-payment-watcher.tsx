'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { logEcpayCheckout } from '@/lib/shop/ecpay-checkout-debug';
import { useEcpayCheckoutFlowStore } from '@/lib/shop/ecpay-checkout-flow-store';
import {
  clearEcpayPaymentSessionOrderId,
  peekEcpayPaymentSessionOrderId,
} from '@/lib/shop/ecpay-payment-session';
import {
  parseShopCheckoutReturnUrl,
  subscribeEcpayReturnMessage,
} from '@/lib/shop/ecpay-payment-return-channel';
import { useCartStore } from '@/lib/shop/cart-store';
import { fetchOrderCheckoutVendorId } from '@/lib/shop/order-logistics-snapshot';
import { createClient } from '@/lib/supabase/client';

const POLL_MS = 2000;

function isPaymentPending(metadata: unknown): boolean {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  const ecpay = (metadata as Record<string, unknown>).ecpay;
  return (
    ecpay != null &&
    typeof ecpay === 'object' &&
    (ecpay as Record<string, unknown>).paymentPending === true
  );
}

/** 常駐 layout：付款 popup 期間輪詢訂單，不依賴 checkout query 或 CheckoutClient 生命週期 */
export function ShopEcpayPaymentWatcher() {
  const router = useRouter();
  const phase = useEcpayCheckoutFlowStore((s) => s.phase);
  const storeOrderId = useEcpayCheckoutFlowStore((s) => s.pendingPaymentOrderId);
  const resetFlow = useEcpayCheckoutFlowStore((s) => s.resetFlow);
  const closeCheckoutPanel = useCartStore((s) => s.closeCheckoutPanel);
  const handledRef = useRef('');

  useEffect(() => {
    logEcpayCheckout('PaymentWatcher mount check', {
      phase,
      storeOrderId,
      sessionOrderId: peekEcpayPaymentSessionOrderId(),
    });
  }, [phase, storeOrderId]);

  useEffect(() => {
    return subscribeEcpayReturnMessage(
      (path) => {
        logEcpayCheckout('PaymentWatcher postMessage navigate', { path });
        window.location.assign(path);
      },
      { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL },
    );
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (
        path.startsWith('/shop/success') ||
        path.startsWith('/shop/payment-complete')
      ) {
        return;
      }
    }

    const sessionOrderId = peekEcpayPaymentSessionOrderId();
    const orderId = (storeOrderId ?? sessionOrderId)?.trim() ?? '';
    const isActivePhase = phase === 'payment' || phase === 'polling';
    const hasPendingSession = Boolean(sessionOrderId);

    if (!orderId || (!isActivePhase && !hasPendingSession)) {
      return;
    }

    logEcpayCheckout('PaymentWatcher active', { orderId, phase });

    let cancelled = false;

    const goSuccess = async (paymentPending: boolean) => {
      const key = paymentPending ? `pending:${orderId}` : `paid:${orderId}`;
      if (handledRef.current === key) return;
      handledRef.current = key;
      logEcpayCheckout(
        paymentPending
          ? 'PaymentWatcher → success (pending)'
          : 'PaymentWatcher → success (paid)',
        { orderId },
      );
      clearEcpayPaymentSessionOrderId();
      resetFlow();
      closeCheckoutPanel();
      const vendorId = await fetchOrderCheckoutVendorId(orderId);
      const q = new URLSearchParams({ order_id: orderId });
      if (paymentPending) q.set('paymentPending', '1');
      if (vendorId) q.set('vendor_id', vendorId);
      window.location.assign(`/shop/success?${q.toString()}`);
    };

    const completePaid = () => {
      void goSuccess(false);
    };

    const completePending = () => {
      void goSuccess(true);
    };

    const tick = async () => {
      if (cancelled) return;

      const returnPath = parseShopCheckoutReturnUrl(window.location.href);
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (returnPath && returnPath !== currentPath) {
        logEcpayCheckout('PaymentWatcher main window return path', { returnPath });
        window.location.assign(returnPath);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select('status, order_metadata')
        .eq('id', orderId)
        .maybeSingle();

      logEcpayCheckout('PaymentWatcher poll', {
        orderId,
        status: data?.status ?? null,
        error: error?.message ?? null,
      });

      if (!error && data?.status === 'paid') {
        completePaid();
        return;
      }

      if (!error && isPaymentPending(data?.order_metadata)) {
        completePending();
      }
    };

    void tick();
    const timer = setInterval(() => {
      void tick();
    }, POLL_MS);

    const onFocus = () => {
      logEcpayCheckout('PaymentWatcher focus');
      void tick();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [phase, storeOrderId, resetFlow, closeCheckoutPanel, router]);

  return null;
}
