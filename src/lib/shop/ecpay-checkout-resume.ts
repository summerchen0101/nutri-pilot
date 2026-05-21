const ECPAY_RESUME_ORDER_ID_KEY = 'ecpayResumeOrderId';

export function setEcpayResumeOrderId(orderId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(ECPAY_RESUME_ORDER_ID_KEY, orderId);
}

export function consumeEcpayResumeOrderId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const orderId = sessionStorage.getItem(ECPAY_RESUME_ORDER_ID_KEY)?.trim() ?? '';
  if (!orderId) return null;
  sessionStorage.removeItem(ECPAY_RESUME_ORDER_ID_KEY);
  return orderId;
}
