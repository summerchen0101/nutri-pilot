const PAYMENT_COMPLETE_SUCCESS_PATH_PREFIX = 'ecpayPaymentCompleteSuccessPath:';

export function getPaymentCompleteSuccessPath(orderId: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const path =
    sessionStorage.getItem(`${PAYMENT_COMPLETE_SUCCESS_PATH_PREFIX}${orderId}`)?.trim() ??
    '';
  return path || null;
}

export function setPaymentCompleteSuccessPath(
  orderId: string,
  path: string,
): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(`${PAYMENT_COMPLETE_SUCCESS_PATH_PREFIX}${orderId}`, path);
}

export function clearPaymentCompleteSuccessPath(orderId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(`${PAYMENT_COMPLETE_SUCCESS_PATH_PREFIX}${orderId}`);
}
