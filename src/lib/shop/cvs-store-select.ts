/**
 * 超商門市地圖／EC 物流選店（預留串接）。
 * 未設定時另開空白分頁並搭配 UI 說明。
 */
export function getCvsStoreSelectUrl(): string {
  const raw = process.env.NEXT_PUBLIC_CVS_STORE_SELECT_URL;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return 'about:blank';
}

export function isCvsStoreSelectUrlConfigured(): boolean {
  const raw = process.env.NEXT_PUBLIC_CVS_STORE_SELECT_URL;
  return typeof raw === 'string' && raw.trim().length > 0;
}

export function openCvsStoreSelectInNewTab(): void {
  window.open(getCvsStoreSelectUrl(), '_blank', 'noopener,noreferrer');
}
