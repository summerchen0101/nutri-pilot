const ECPAY_CHECKOUT_ERROR_KEY = 'ecpayCheckoutError';

export function setEcpayCheckoutReturnError(message: string): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(ECPAY_CHECKOUT_ERROR_KEY, message);
  }
}

export function consumeEcpayCheckoutReturnError(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const msg = sessionStorage.getItem(ECPAY_CHECKOUT_ERROR_KEY);
  if (msg) sessionStorage.removeItem(ECPAY_CHECKOUT_ERROR_KEY);
  return msg;
}
