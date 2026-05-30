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
  const qs = new URLSearchParams(params).toString();
  if (nativeReturn) {
    return `nutriguard://shop?${qs}`;
  }
  return `${appOrigin.replace(/\/$/, "")}/shop?${qs}`;
}
