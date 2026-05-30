'use client';

import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import {
  buildCheckoutReturnPath,
  consumeEcpayBridgeResume,
} from '@/lib/shop/ecpay-bridge-resume';
import { useEcpayCheckoutFlowStore } from '@/lib/shop/ecpay-checkout-flow-store';
import { useCartStore } from '@/lib/shop/cart-store';

/**
 * 使用者手動關閉 InAppBrowser 時恢復結帳（成功回跳由 ShopEcpayReturnHandler 處理）。
 */
export function EcpayBrowserListener() {
  const router = useRouter();
  const openCheckoutPanel = useCartStore((s) => s.openCheckoutPanel);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let handle: { remove: () => Promise<void> } | undefined;

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
      handle = listener;
    });

    return () => {
      void handle?.remove();
    };
  }, [openCheckoutPanel, router]);

  return null;
}
