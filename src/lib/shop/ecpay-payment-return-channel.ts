export const ECPAY_RETURN_MESSAGE_TYPE = 'nutri-pilot:ecpay-return';

export interface EcpayReturnMessage {
  type: typeof ECPAY_RETURN_MESSAGE_TYPE;
  url: string;
}

/** 將絕對或相對 URL 正規化為 app 內 path（/shop?…） */
export function normalizeEcpayReturnPath(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = trimmed.startsWith('http://') || trimmed.startsWith('https://') ?
      new URL(trimmed)
    : new URL(trimmed, 'http://local.test');

    if (!parsed.pathname.startsWith('/shop')) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function isEcpayReturnMessage(data: unknown): data is EcpayReturnMessage {
  if (data == null || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.type === ECPAY_RETURN_MESSAGE_TYPE &&
    typeof msg.url === 'string' &&
    normalizeEcpayReturnPath(msg.url) != null
  );
}

export function isAllowedEcpayReturnMessageOrigin(
  eventOrigin: string,
  appOrigin: string,
  supabaseUrl?: string,
): boolean {
  if (eventOrigin === appOrigin) return true;
  if (!supabaseUrl) return false;
  try {
    return eventOrigin === new URL(supabaseUrl).origin;
  } catch {
    return false;
  }
}

export function parseShopCheckoutReturnUrl(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;

    const params = url.searchParams;
    if (
      params.get('checkout') === '1' &&
      (params.get('paymentDone') === '1' || params.get('paymentFailed') === '1')
    ) {
      return `${url.pathname}${url.search}`;
    }

    if (url.pathname.startsWith('/shop/success')) {
      return `${url.pathname}${url.search}`;
    }

    return null;
  } catch {
    return null;
  }
}

export function subscribeEcpayReturnMessage(
  onReturn: (path: string) => void,
  options?: { supabaseUrl?: string },
): () => void {
  const appOrigin = window.location.origin;
  const supabaseUrl = options?.supabaseUrl;

  const handler = (event: MessageEvent) => {
    if (!isEcpayReturnMessage(event.data)) return;
    if (!isAllowedEcpayReturnMessageOrigin(
      event.origin,
      appOrigin,
      supabaseUrl,
    )) {
      return;
    }
    const path = normalizeEcpayReturnPath(event.data.url);
    if (!path) return;
    onReturn(path);
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
