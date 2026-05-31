'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { setEcpayCheckoutReturnError } from '@/lib/shop/ecpay-checkout-return-error';
import { setEcpayResumeOrderId } from '@/lib/shop/ecpay-checkout-resume';
import { clearEcpayPaymentSessionOrderId } from '@/lib/shop/ecpay-payment-session';
import { resolvePaymentCompleteDestination } from '@/lib/shop/ecpay-payment-complete-flow';
import {
  getPaymentCompleteSuccessPath,
  setPaymentCompleteSuccessPath,
} from '@/lib/shop/ecpay-payment-complete-session';
import { useEcpayCheckoutFlowStore } from '@/lib/shop/ecpay-checkout-flow-store';
import { useCartStore } from '@/lib/shop/cart-store';
import { logEcpayCheckout } from '@/lib/shop/ecpay-checkout-debug';

/** 原生／Web 付款回跳專用：輪詢入帳後導向 /shop/success，不經商品列表 handler */
export function PaymentCompleteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const closeCheckoutPanel = useCartStore((s) => s.closeCheckoutPanel);
  const openCheckoutPanel = useCartStore((s) => s.openCheckoutPanel);
  const resetFlow = useEcpayCheckoutFlowStore((s) => s.resetFlow);
  const handledRef = useRef('');

  useEffect(() => {
    const orderId = searchParams.get('orderId')?.trim() ?? '';
    if (!orderId) {
      router.replace('/shop');
      return;
    }

    const rtnCode = searchParams.get('rtnCode')?.trim() ?? '';
    const paymentPending = searchParams.get('paymentPending') === '1';
    const merchantOrderNo = searchParams.get('merchant_order_no')?.trim() ?? '';
    const actionKey = `${orderId}:${rtnCode}:${paymentPending ? '1' : '0'}`;

    const cachedSuccessPath = getPaymentCompleteSuccessPath(orderId);
    if (cachedSuccessPath) {
      router.replace(cachedSuccessPath);
      return;
    }

    if (handledRef.current === actionKey) {
      return;
    }
    handledRef.current = actionKey;

    logEcpayCheckout('PaymentComplete start', {
      orderId,
      rtnCode,
      paymentPending,
      merchantOrderNo,
    });

    closeCheckoutPanel();

    void (async () => {
      const result = await resolvePaymentCompleteDestination({
        orderId,
        rtnCode,
        paymentPending,
        merchantOrderNo,
      });

      if (result.kind === 'success') {
        logEcpayCheckout('PaymentComplete → success', { path: result.path });
        clearEcpayPaymentSessionOrderId();
        resetFlow();
        setPaymentCompleteSuccessPath(orderId, result.path);
        router.replace(result.path);
        return;
      }

      logEcpayCheckout('PaymentComplete → checkout', { error: result.error });
      setEcpayCheckoutReturnError(result.error);
      setEcpayResumeOrderId(orderId);
      resetFlow();
      openCheckoutPanel();
      router.replace('/shop');
    })();
  }, [
    closeCheckoutPanel,
    openCheckoutPanel,
    resetFlow,
    router,
    searchParams,
  ]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[15px] font-medium text-foreground">確認付款結果…</p>
      <p className="mt-2 text-[13px] text-muted-foreground">請稍候，即將為您導向完成頁</p>
    </div>
  );
}
