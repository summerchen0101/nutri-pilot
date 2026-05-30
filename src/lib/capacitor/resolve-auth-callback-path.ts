const AUTH_CALLBACK_PREFIX = '/auth/callback';

/**
 * 將 Magic Link / App Links / 自訂 scheme URL 轉成 App 內 /auth/callback 路徑（含 query）。
 */
export function resolveAuthCallbackPath(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === 'nutriguard:') {
      if (parsed.pathname.startsWith(AUTH_CALLBACK_PREFIX)) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      if (parsed.host === 'auth') {
        const path = parsed.pathname || '/callback';
        return `/auth${path}${parsed.search}${parsed.hash}`;
      }
      return null;
    }

    const appBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    if (appBase) {
      const base = new URL(appBase);
      if (parsed.origin !== base.origin) {
        return null;
      }
    }

    if (parsed.pathname.startsWith(AUTH_CALLBACK_PREFIX)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return null;
  } catch {
    return null;
  }
}
