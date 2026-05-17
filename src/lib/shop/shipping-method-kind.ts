import { STORE_PICKUP_SHIPPING_CODE } from '@/lib/shop/vendor-shipping';

/** 與 migration 種子 `home_delivery` 一致 */
export function isHomeDeliveryCode(code: string | null): boolean {
  return code === 'home_delivery';
}

/**
 * 超商取貨等非宅配（已排除停用之 store_pickup）。
 * `code === null` 時應視為舊版 fallback，走宅配／地址路徑，勿當 CVS。
 */
export function isCvsShippingCode(code: string | null): boolean {
  if (code == null || code.length === 0) return false;
  if (code === STORE_PICKUP_SHIPPING_CODE) return false;
  return !isHomeDeliveryCode(code);
}
