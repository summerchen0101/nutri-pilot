const SESSION_KEY = 'ecpay:pendingPaymentOrderId';

export function setEcpayPaymentSessionOrderId(orderId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, orderId);
}

export function peekEcpayPaymentSessionOrderId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(SESSION_KEY)?.trim() ?? null;
}

export function clearEcpayPaymentSessionOrderId(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}
