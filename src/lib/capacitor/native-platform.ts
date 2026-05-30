'use client';

import { Capacitor } from '@capacitor/core';

/** Capacitor 原生殼（iOS / Android），非一般行動瀏覽器。 */
export function isCapacitorNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** Magic Link / OAuth 回調應使用的 HTTPS 網域（與 Supabase Redirect 白名單一致）。 */
export function getAuthRedirectBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) {
    return configured;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

const NATIVE_AUTH_CALLBACK_URL = 'nutriguard://auth/callback';

export function buildAuthCallbackRedirectUrl(nextPath: string): string {
  const next =
    nextPath.startsWith('/') && !nextPath.startsWith('//')
      ? nextPath
      : '/dashboard';

  // 原生 App：Magic Link 用自訂 scheme，點信後系統會開啟 Nutri Guard（非 Safari）
  if (isCapacitorNativePlatform()) {
    if (next === '/dashboard') {
      return NATIVE_AUTH_CALLBACK_URL;
    }
    return `${NATIVE_AUTH_CALLBACK_URL}?next=${encodeURIComponent(next)}`;
  }

  const base = getAuthRedirectBaseUrl();
  const callback = `${base}/auth/callback`;
  if (next === '/dashboard') {
    return callback;
  }
  return `${callback}?next=${encodeURIComponent(next)}`;
}
