import { STORE_PICKUP_SHIPPING_CODE } from '@/lib/shop/vendor-shipping';

/** 與 migration 種子 `home_delivery` 一致 */
export function isHomeDeliveryCode(code: string | null | undefined): boolean {
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

/** 超商取貨付款（物流代收，到店支付） */
export const CVS_COD_SHIPPING_CODES = [
  'seven_eleven_cod',
  'family_mart_cod',
] as const;

export type CvsCodShippingCode = (typeof CVS_COD_SHIPPING_CODES)[number];

export function isCvsCodShippingCode(code: string | null | undefined): boolean {
  if (code == null || code.length === 0) return false;
  return (CVS_COD_SHIPPING_CODES as readonly string[]).includes(code);
}

export function cvsCodShippingDisplayLabel(code: string | null): string | null {
  if (code === 'seven_eleven_cod') return '7-11 取貨付款';
  if (code === 'family_mart_cod') return '全家取貨付款';
  return null;
}
