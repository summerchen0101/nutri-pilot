const LOG_PREFIX = '[ecpay-checkout]';

/** 開發除錯：Console 篩選 `ecpay-checkout` 可看完整付款回傳流程 */
export function logEcpayCheckout(
  event: string,
  detail?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === 'production') return;
  if (detail != null) {
    console.log(LOG_PREFIX, event, detail);
    return;
  }
  console.log(LOG_PREFIX, event);
}

export function snapshotMainWindow(): Record<string, string> {
  if (typeof window === 'undefined') {
    return { href: '', pathname: '', search: '' };
  }
  return {
    href: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

export function snapshotPopup(popup: Window): Record<string, unknown> {
  try {
    if (popup.closed) {
      return { closed: true };
    }
    return {
      closed: false,
      href: popup.location.href,
      pathname: popup.location.pathname,
      search: popup.location.search,
    };
  } catch (error) {
    return {
      closed: popup.closed,
      crossOrigin: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function snapshotSearchParams(
  searchParams: URLSearchParams,
): Record<string, string> {
  const out: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
