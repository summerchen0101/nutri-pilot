/**
 * 將 Capacitor 自訂 scheme（nutriguard://shop?…）轉成 App 內 /shop 路徑。
 */
export function resolveEcpayReturnPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'nutriguard:') {
      return null;
    }
    if (parsed.host !== 'shop') {
      return null;
    }

    const params = parsed.searchParams;
    if (params.get('checkout') !== '1') {
      return null;
    }

    const isKnownReturn =
      params.get('paymentDone') === '1' ||
      params.get('paymentFailed') === '1' ||
      params.get('logisticsDone') === '1';

    if (!isKnownReturn) {
      return null;
    }

    return `/shop${parsed.search}`;
  } catch {
    return null;
  }
}
