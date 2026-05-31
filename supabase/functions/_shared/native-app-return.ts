/** Capacitor InAppBrowser 無 WebView cookie，改以自訂 scheme 交回主 App */
export function isNativeReturnRequested(url: URL): boolean {
  return url.searchParams.get("nativeReturn") === "1";
}

export function appendNativeReturnQuery(
  baseUrl: string,
  nativeReturn: boolean,
): string {
  if (!nativeReturn) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}nativeReturn=1`;
}

export function buildShopReturnUrl(
  appOrigin: string,
  params: Record<string, string>,
  nativeReturn: boolean,
): string {
  if (nativeReturn && params.paymentDone === "1") {
    const completeParams = new URLSearchParams();
    if (params.orderId) completeParams.set("orderId", params.orderId);
    if (params.rtnCode) completeParams.set("rtnCode", params.rtnCode);
    if (params.paymentPending === "1") {
      completeParams.set("paymentPending", "1");
    }
    if (params.merchant_order_no) {
      completeParams.set("merchant_order_no", params.merchant_order_no);
    }
    return `nutriguard://shop/payment-complete?${completeParams.toString()}`;
  }

  const qs = new URLSearchParams(params).toString();
  if (nativeReturn) {
    return `nutriguard://shop?${qs}`;
  }
  return `${appOrigin.replace(/\/$/, "")}/shop?${qs}`;
}
