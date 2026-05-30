'use client';

const ECPAY_BRIDGE_ORDER_ID_KEY = 'ecpayBridgeResumeOrderId';
const ECPAY_BRIDGE_KIND_KEY = 'ecpayBridgeKind';

export type EcpayBridgeKind = 'logistics' | 'payment';

export function buildCheckoutReturnPath(orderId: string): string {
  const params = new URLSearchParams({ checkout: '1', orderId });
  return `/shop?${params.toString()}`;
}

export function prepareEcpayBridgeResume(
  orderId: string,
  kind: EcpayBridgeKind,
): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(ECPAY_BRIDGE_ORDER_ID_KEY, orderId);
  sessionStorage.setItem(ECPAY_BRIDGE_KIND_KEY, kind);
}

export function consumeEcpayBridgeResume(): {
  orderId: string;
  kind: EcpayBridgeKind;
} | null {
  if (typeof sessionStorage === 'undefined') return null;

  const orderId =
    sessionStorage.getItem(ECPAY_BRIDGE_ORDER_ID_KEY)?.trim() ?? '';
  const kind = sessionStorage.getItem(ECPAY_BRIDGE_KIND_KEY);
  sessionStorage.removeItem(ECPAY_BRIDGE_ORDER_ID_KEY);
  sessionStorage.removeItem(ECPAY_BRIDGE_KIND_KEY);

  if (!orderId) return null;
  if (kind !== 'logistics' && kind !== 'payment') return null;
  return { orderId, kind };
}

/** 深連結已成功回跳時清除，避免 browserFinished 重複處理 */
export function clearEcpayBridgeResume(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(ECPAY_BRIDGE_ORDER_ID_KEY);
  sessionStorage.removeItem(ECPAY_BRIDGE_KIND_KEY);
}

/** @deprecated 請改用 consumeEcpayBridgeResume */
export function consumeEcpayBridgeKind(): EcpayBridgeKind | null {
  return consumeEcpayBridgeResume()?.kind ?? null;
}

export function prepareEcpayLogisticsBridgeResume(orderId: string): void {
  prepareEcpayBridgeResume(orderId, 'logistics');
}

export function prepareEcpayPaymentBridgeResume(orderId: string): void {
  prepareEcpayBridgeResume(orderId, 'payment');
}
