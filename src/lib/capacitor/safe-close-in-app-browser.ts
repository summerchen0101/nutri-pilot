import { Browser } from '@capacitor/browser';

/** nutriguard:// 回跳時 InAppBrowser 可能已自行關閉，忽略 close 失敗 */
export async function safeCloseInAppBrowser(): Promise<void> {
  try {
    await Browser.close();
  } catch {
    // no active browser window
  }
}
