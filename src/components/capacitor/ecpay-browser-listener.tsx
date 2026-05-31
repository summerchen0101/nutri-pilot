'use client';

import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { resolveEcpayReturnPath } from '@/lib/capacitor/resolve-ecpay-return-path';
import { safeCloseInAppBrowser } from '@/lib/capacitor/safe-close-in-app-browser';
import {
  buildCheckoutReturnPath,
  consumeEcpayBridgeResume,
} from '@/lib/shop/ecpay-bridge-resume';
import { useEcpayCheckoutFlowStore } from '@/lib/shop/ecpay-checkout-flow-store';
import { useCartStore } from '@/lib/shop/cart-store';

function shouldCloseBrowserForAppPath(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return (
    path.startsWith('/shop/payment-complete') ||
    path.startsWith('/shop/success')
  );
}

/**
 * InAppBrowser 生命週期：手動關閉恢復結帳；App 已回到完成漏斗時強制關閉 overlay。
 */
export function EcpayBrowserListener() {
  const router = useRouter();
  const openCheckoutPanel = useCartStore((s) => s.openCheckoutPanel);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let browserHandle: { remove: () => Promise<void> } | undefined;
    let appOpenHandle: { remove: () => Promise<void> } | undefined;
    let appStateHandle: { remove: () => Promise<void> } | undefined;

    void Browser.addListener('browserFinished', () => {
      const bridge = consumeEcpayBridgeResume();
      if (!bridge) {
        return;
      }

      const { orderId, kind } = bridge;
      if (kind === 'logistics') {
        useEcpayCheckoutFlowStore.getState().signalMapReturn(orderId);
      }

      openCheckoutPanel();
      router.replace(buildCheckoutReturnPath(orderId));
    }).then((listener) => {
      browserHandle = listener;
    });

    void App.addListener('appUrlOpen', (event) => {
      if (resolveEcpayReturnPath(event.url)) {
        void safeCloseInAppBrowser();
      }
    }).then((listener) => {
      appOpenHandle = listener;
    });

    void App.addListener('appStateChange', (state) => {
      if (!state.isActive || !shouldCloseBrowserForAppPath()) {
        return;
      }
      void safeCloseInAppBrowser();
    }).then((listener) => {
      appStateHandle = listener;
    });

    return () => {
      void browserHandle?.remove();
      void appOpenHandle?.remove();
      void appStateHandle?.remove();
    };
  }, [openCheckoutPanel, router]);

  return null;
}
