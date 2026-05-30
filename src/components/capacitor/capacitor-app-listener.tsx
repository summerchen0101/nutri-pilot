'use client';

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';

const AUTH_CALLBACK_PREFIX = '/auth/callback';

function resolveInAppPath(url: string): string | null {
  try {
    const parsed = new URL(url);
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
    if (parsed.protocol === 'nutriguard:' && parsed.host === 'auth') {
      const path = parsed.pathname || '/callback';
      const search = parsed.search || '';
      return `/auth${path}${search}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Magic Link / App Links 冷啟動時，將外部 URL 導向 Next.js /auth/callback。
 */
export function CapacitorAppListener() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleOpen = (event: { url: string }) => {
      const path = resolveInAppPath(event.url);
      if (!path || typeof window === 'undefined') {
        return;
      }
      const target = `${window.location.origin}${path}`;
      if (window.location.href !== target) {
        window.location.assign(target);
      }
    };

    let listenerHandle: { remove: () => Promise<void> } | undefined;

    void App.addListener('appUrlOpen', handleOpen).then((handle) => {
      listenerHandle = handle;
      void App.getLaunchUrl().then((launch) => {
        if (launch?.url) {
          handleOpen({ url: launch.url });
        }
      });
    });

    return () => {
      void listenerHandle?.remove();
    };
  }, []);

  return null;
}
