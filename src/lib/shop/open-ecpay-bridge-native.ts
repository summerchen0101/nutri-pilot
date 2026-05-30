'use client';

import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

import {
  buildLogisticsMapAutoSubmitUrl,
  buildPaymentAutoSubmitUrl,
} from '@/lib/shop/ecpay-bridge-paths';
import {
  prepareEcpayLogisticsBridgeResume,
  prepareEcpayPaymentBridgeResume,
} from '@/lib/shop/ecpay-bridge-resume';
import { createClient } from '@/lib/supabase/client';

export type OpenNativeEcpayBridgeResult =
  | { ok: true }
  | { ok: false; error: string };

export function shouldUseNativeEcpayBridge(): boolean {
  return Capacitor.isNativePlatform();
}

async function getNativeBridgeAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function openNativeBridgeUrl(url: string): Promise<OpenNativeEcpayBridgeResult> {
  try {
    await Browser.open({ url, presentationStyle: 'popover' });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '無法開啟瀏覽器視窗',
    };
  }
}

export async function openNativeLogisticsMapBridge(
  orderId: string,
  vendorId: string,
): Promise<OpenNativeEcpayBridgeResult> {
  const accessToken = await getNativeBridgeAccessToken();
  if (!accessToken) {
    return { ok: false, error: '請先登入' };
  }

  prepareEcpayLogisticsBridgeResume(orderId);
  const url = buildLogisticsMapAutoSubmitUrl(orderId, vendorId, {
    accessToken,
    nativeReturn: true,
  });
  return openNativeBridgeUrl(url);
}

export async function openNativePaymentBridge(
  orderId: string,
): Promise<OpenNativeEcpayBridgeResult> {
  const accessToken = await getNativeBridgeAccessToken();
  if (!accessToken) {
    return { ok: false, error: '請先登入' };
  }

  prepareEcpayPaymentBridgeResume(orderId);
  const url = buildPaymentAutoSubmitUrl(orderId, {
    accessToken,
    nativeReturn: true,
  });
  return openNativeBridgeUrl(url);
}
