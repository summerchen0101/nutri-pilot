const PROCESSED_ECPAY_RETURN_URL_KEY = 'capacitor-processed-ecpay-return-url';

export function isProcessedEcpayReturnUrl(url: string): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(PROCESSED_ECPAY_RETURN_URL_KEY) === url;
}

export function markProcessedEcpayReturnUrl(url: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PROCESSED_ECPAY_RETURN_URL_KEY, url);
}

export function clearProcessedEcpayReturnUrl(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(PROCESSED_ECPAY_RETURN_URL_KEY);
}
