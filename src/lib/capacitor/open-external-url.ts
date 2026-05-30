'use client';

import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/**
 * 原生 WebView 上 window.open 常回傳 null；改以 InAppBrowser 開啟綠界等外部頁。
 * 回傳 true 表示已交由 Browser 處理（無 Window 參考）。
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  await Browser.open({ url, presentationStyle: 'popover' });
  return true;
}
