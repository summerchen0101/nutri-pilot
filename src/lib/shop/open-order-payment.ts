'use client';

import { fetchEcpayCheckoutPayload } from '@/app/(main)/shop/actions';
import { redirectToPaymentBridge } from '@/lib/shop/ecpay-bridge-paths';
import {
  openNativePaymentBridge,
  shouldUseNativeEcpayBridge,
} from '@/lib/shop/open-ecpay-bridge-native';
import {
  isEcpaySubmitBridgePayload,
} from '@/lib/shop/ecpay-bridge-types';
import {
  ECPAY_PAYMENT_POPUP_NAME,
  openEcpayPopup,
  submitPaymentBridgeToNamedPopup,
} from '@/lib/shop/ecpay-popup-form';

export type OpenOrderPaymentResult =
  | { ok: true }
  | { ok: false; error: string };

export async function openOrderPayment(
  orderId: string,
): Promise<OpenOrderPaymentResult> {
  const popup = openEcpayPopup(ECPAY_PAYMENT_POPUP_NAME);
  if (!popup) {
    if (shouldUseNativeEcpayBridge()) {
      return openNativePaymentBridge(orderId);
    }
    redirectToPaymentBridge(orderId);
    return { ok: true };
  }

  try {
    const bridge = await fetchEcpayCheckoutPayload({
      orderId,
      clientOrigin: window.location.origin,
    });
    if (!bridge.ok) {
      popup.close();
      return { ok: false, error: bridge.error };
    }
    if ('skipPayment' in bridge && bridge.skipPayment) {
      popup.close();
      return { ok: false, error: '此訂單無需付款' };
    }
    if (!isEcpaySubmitBridgePayload(bridge)) {
      popup.close();
      return { ok: false, error: '綠界回應格式不正確' };
    }
    submitPaymentBridgeToNamedPopup(ECPAY_PAYMENT_POPUP_NAME, bridge);
    return { ok: true };
  } catch (e) {
    try {
      popup.close();
    } catch {
      /* ignore */
    }
    const msg = e instanceof Error ? e.message : '付款視窗開啟失敗';
    return { ok: false, error: msg };
  }
}
