'use client';

import {
  prepareEcpayLogisticsBridgeResume,
  prepareEcpayPaymentBridgeResume,
} from '@/lib/shop/ecpay-bridge-resume';

export const ECPAY_PAYMENT_BRIDGE_PATH = '/shop/payment-bridge';
export const ECPAY_LOGISTICS_MAP_BRIDGE_PATH = '/shop/logistics-map-bridge';
export const ECPAY_PAYMENT_AUTO_SUBMIT_PATH =
  '/shop/payment-bridge/auto-submit';
export const ECPAY_LOGISTICS_MAP_AUTO_SUBMIT_PATH =
  '/shop/logistics-map-bridge/auto-submit';

function resolveOrigin(origin?: string): string {
  if (origin) return origin.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

export function buildPaymentBridgeUrl(orderId: string): string {
  return `${ECPAY_PAYMENT_BRIDGE_PATH}?orderId=${encodeURIComponent(orderId)}`;
}

export function buildLogisticsMapBridgeUrl(
  orderId: string,
  vendorId: string,
): string {
  return `${ECPAY_LOGISTICS_MAP_BRIDGE_PATH}?orderId=${encodeURIComponent(orderId)}&vendorId=${encodeURIComponent(vendorId)}`;
}

interface AutoSubmitUrlOptions {
  origin?: string;
  /** InAppBrowser 無 WebView cookie，須由 App 帶入 Supabase access token */
  accessToken?: string;
  /** Capacitor 原生：回跳改走 nutriguard:// 深連結 */
  nativeReturn?: boolean;
}

function appendAccessToken(
  params: URLSearchParams,
  accessToken?: string,
): URLSearchParams {
  const token = accessToken?.trim() ?? '';
  if (token) {
    params.set('token', token);
  }
  return params;
}

function appendAutoSubmitParams(
  params: URLSearchParams,
  options?: AutoSubmitUrlOptions,
): URLSearchParams {
  appendAccessToken(params, options?.accessToken);
  if (options?.nativeReturn) {
    params.set('nativeReturn', '1');
  }
  return params;
}

export function buildPaymentAutoSubmitUrl(
  orderId: string,
  options?: AutoSubmitUrlOptions,
): string {
  const base = resolveOrigin(options?.origin);
  const params = appendAutoSubmitParams(
    new URLSearchParams({ orderId }),
    options,
  );
  return `${base}${ECPAY_PAYMENT_AUTO_SUBMIT_PATH}?${params.toString()}`;
}

export function buildLogisticsMapAutoSubmitUrl(
  orderId: string,
  vendorId: string,
  options?: AutoSubmitUrlOptions,
): string {
  const base = resolveOrigin(options?.origin);
  const params = appendAutoSubmitParams(
    new URLSearchParams({ orderId, vendorId }),
    options,
  );
  return `${base}${ECPAY_LOGISTICS_MAP_AUTO_SUBMIT_PATH}?${params.toString()}`;
}

export function redirectToPaymentBridge(orderId: string): void {
  prepareEcpayPaymentBridgeResume(orderId);
  window.location.assign(buildPaymentBridgeUrl(orderId));
}

export function redirectToLogisticsMapBridge(
  orderId: string,
  vendorId: string,
): void {
  prepareEcpayLogisticsBridgeResume(orderId);
  window.location.assign(buildLogisticsMapBridgeUrl(orderId, vendorId));
}
