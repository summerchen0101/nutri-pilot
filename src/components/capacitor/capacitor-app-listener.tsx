'use client';

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';

import { getAuthRedirectBaseUrl } from '@/lib/capacitor/native-platform';
import { resolveAuthCallbackPath } from '@/lib/capacitor/resolve-auth-callback-path';

const PROCESSED_LAUNCH_URL_KEY = 'capacitor-processed-launch-url';

function navigateToAuthCallback(path: string): void {
  const base = getAuthRedirectBaseUrl();
  if (!base) {
    return;
  }
  const target = `${base.replace(/\/$/, '')}${path}`;
  if (window.location.href === target) {
    return;
  }
  window.location.replace(target);
}

function processIncomingUrl(url: string): void {
  const path = resolveAuthCallbackPath(url);
  if (!path) {
    return;
  }

  const processed = sessionStorage.getItem(PROCESSED_LAUNCH_URL_KEY);
  if (processed === url) {
    return;
  }
  sessionStorage.setItem(PROCESSED_LAUNCH_URL_KEY, url);
  navigateToAuthCallback(path);
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
      processIncomingUrl(event.url);
    };

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) {
        handleOpen({ url: launch.url });
      }
    });

    let openHandle: { remove: () => Promise<void> } | undefined;
    let resumeHandle: { remove: () => Promise<void> } | undefined;

    void App.addListener('appUrlOpen', handleOpen).then((handle) => {
      openHandle = handle;
    });

    void App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        return;
      }
      void App.getLaunchUrl().then((launch) => {
        if (launch?.url) {
          handleOpen({ url: launch.url });
        }
      });
    }).then((handle) => {
      resumeHandle = handle;
    });

    return () => {
      void openHandle?.remove();
      void resumeHandle?.remove();
    };
  }, []);

  return null;
}
