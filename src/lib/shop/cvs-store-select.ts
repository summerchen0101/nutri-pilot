/**
 * @deprecated 超商門市改由結帳流程開啟綠界 Express/map，不再使用外部 URL。
 */
export function getCvsStoreSelectUrl(): string {
  return 'about:blank';
}

export function isCvsStoreSelectUrlConfigured(): boolean {
  return false;
}

export function openCvsStoreSelectInNewTab(): void {
  /* 門市選擇已整合至綠界物流地圖 */
}
