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

export function buildAuthCallbackRedirectUrl(nextPath: string): string {
  const base = getAuthRedirectBaseUrl();
  const next =
    nextPath.startsWith('/') && !nextPath.startsWith('//')
      ? nextPath
      : '/dashboard';
  const callback = `${base}/auth/callback`;
  // 預設 dashboard 不帶 ?next=，避免 Supabase redirect_to 嵌套 query 導致導向錯誤
  if (next === '/dashboard') {
    return callback;
  }
  return `${callback}?next=${encodeURIComponent(next)}`;
}
