'use client';

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { getAuthRedirectBaseUrl } from '@/lib/capacitor/native-platform';
import { resolveAuthCallbackPath } from '@/lib/capacitor/resolve-auth-callback-path';
import { resolveEcpayReturnPath } from '@/lib/capacitor/resolve-ecpay-return-path';
import { safeCloseInAppBrowser } from '@/lib/capacitor/safe-close-in-app-browser';
import { clearEcpayBridgeResume } from '@/lib/shop/ecpay-bridge-resume';

const PROCESSED_LAUNCH_URL_KEY = 'capacitor-processed-launch-url';

function navigateToAuthCallback(path: string): void {
  const base = getAuthRedirectBaseUrl();
  const target = base ? `${base.replace(/\/$/, '')}${path}` : path;
  if (window.location.href === target) {
    return;
  }
  window.location.replace(target);
}

/**
 * Magic Link / App Links 冷啟動時，將外部 URL 導向 Next.js /auth/callback。
 */
export function CapacitorAppListener() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const processIncomingUrl = (url: string) => {
      const authPath = resolveAuthCallbackPath(url);
      if (authPath) {
        const processed = sessionStorage.getItem(PROCESSED_LAUNCH_URL_KEY);
        if (processed === url) {
          return;
        }
        sessionStorage.setItem(PROCESSED_LAUNCH_URL_KEY, url);
        navigateToAuthCallback(authPath);
        return;
      }

      const ecpayPath = resolveEcpayReturnPath(url);
      if (!ecpayPath) {
        return;
      }

      void safeCloseInAppBrowser();
      clearEcpayBridgeResume();
      router.replace(ecpayPath);
    };

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
  }, [router]);

  return null;
}
