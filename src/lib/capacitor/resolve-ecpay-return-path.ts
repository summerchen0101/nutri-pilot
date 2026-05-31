/**
 * 將 Capacitor 自訂 scheme 轉成 App 內路徑。
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

    if (parsed.pathname === '/payment-complete') {
      const orderId = parsed.searchParams.get('orderId')?.trim() ?? '';
      if (!orderId) return null;
      return `/shop/payment-complete${parsed.search}`;
    }

    const params = parsed.searchParams;
    if (params.get('checkout') !== '1') {
      return null;
    }

    if (params.get('paymentDone') === '1') {
      return buildPaymentCompletePath(params);
    }

    if (
      params.get('paymentFailed') === '1' ||
      params.get('logisticsDone') === '1' ||
      params.get('logisticsError') === '1'
    ) {
      return `/shop${parsed.search}`;
    }

    return null;
  } catch {
    return null;
  }
}

function buildPaymentCompletePath(params: URLSearchParams): string | null {
  const orderId = params.get('orderId')?.trim() ?? '';
  if (!orderId) return null;

  const complete = new URLSearchParams({ orderId });
  const rtnCode = params.get('rtnCode')?.trim();
  if (rtnCode) complete.set('rtnCode', rtnCode);
  if (params.get('paymentPending') === '1') {
    complete.set('paymentPending', '1');
  }
  const merchantOrderNo = params.get('merchant_order_no')?.trim();
  if (merchantOrderNo) {
    complete.set('merchant_order_no', merchantOrderNo);
  }

  return `/shop/payment-complete?${complete.toString()}`;
}
