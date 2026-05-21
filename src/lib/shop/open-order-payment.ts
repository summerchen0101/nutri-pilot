'use client';

import { fetchEcpayCheckoutPayload } from '@/app/(main)/shop/actions';
import {
  ECPAY_PAYMENT_POPUP_NAME,
  openEcpayPopup,
  submitBridgeToNamedPopup,
} from '@/lib/shop/ecpay-popup-form';

const PAYMENT_BRIDGE_PATH = '/shop/payment-bridge';

export type OpenOrderPaymentResult =
  | { ok: true }
  | { ok: false; error: string };

export async function openOrderPayment(
  orderId: string,
): Promise<OpenOrderPaymentResult> {
  const popup = openEcpayPopup(ECPAY_PAYMENT_POPUP_NAME);
  if (!popup) {
    window.location.assign(
      `${PAYMENT_BRIDGE_PATH}?orderId=${encodeURIComponent(orderId)}`,
    );
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
    submitBridgeToNamedPopup(ECPAY_PAYMENT_POPUP_NAME, bridge);
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
