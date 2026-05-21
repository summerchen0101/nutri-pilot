import { isCheckoutSnapshotLike } from '@/lib/shop/build-remaining-logistics-queue';
import {
  isCvsCodShippingCode,
  isHomeDeliveryCode,
} from '@/lib/shop/shipping-method-kind';

interface LogisticsDraftLike {
  logisticsType?: string;
  completed?: boolean;
  storeSelected?: boolean;
  logisticsCreated?: boolean;
  cvsStoreId?: string | null;
  ecpayLogisticsTradeNo?: string | null;
}

interface VendorSnapshotLike {
  vendorId: string;
  shippingMethodCode?: string | null;
}

interface SnapshotLike {
  vendors?: VendorSnapshotLike[];
  logisticsByVendor?: Record<string, LogisticsDraftLike | null>;
  logisticsCompleted?: boolean;
}

function isVendorLogisticsReady(
  draft: LogisticsDraftLike | null | undefined,
  shippingMethodCode: string | null | undefined,
): boolean {
  if (!draft) return false;
  if (draft.logisticsType === 'HOME') {
    return draft.completed === true;
  }
  if (isCvsCodShippingCode(shippingMethodCode)) {
    return (
      draft.logisticsCreated === true &&
      Boolean(draft.ecpayLogisticsTradeNo)
    );
  }
  return draft.storeSelected === true && Boolean(draft.cvsStoreId);
}

/**
 * 付款成功後是否可視為該廠物流步驟完成。
 * 宅配：地址已在付款前標記 completed，不需等 ECPay 建單回寫 logisticsCreated。
 * 超商預付：需等 ReturnURL 觸發 createPendingLogisticsForOrder 後 logisticsCreated。
 */
export function isVendorPostPaymentReady(
  draft: LogisticsDraftLike | null | undefined,
  shippingMethodCode: string | null | undefined,
): boolean {
  if (!draft) return false;
  if (draft.logisticsType === 'HOME' || isHomeDeliveryCode(shippingMethodCode)) {
    return draft.completed === true;
  }
  if (isCvsCodShippingCode(shippingMethodCode)) {
    return (
      draft.logisticsCreated === true &&
      Boolean(draft.ecpayLogisticsTradeNo)
    );
  }
  return draft.logisticsCreated === true;
}

/** 與 Edge `recomputeLogisticsCompleted` 對齊，不依賴可能過期的 logisticsCompleted 旗標 */
export function isCheckoutLogisticsReadyForPayment(
  checkoutSnapshot: unknown,
): boolean {
  if (!isCheckoutSnapshotLike(checkoutSnapshot)) return false;
  const snap = checkoutSnapshot as SnapshotLike;
  const vendors = snap.vendors ?? [];
  if (vendors.length === 0) return false;
  for (const vendor of vendors) {
    const draft = snap.logisticsByVendor?.[vendor.vendorId];
    if (!isVendorLogisticsReady(draft, vendor.shippingMethodCode)) {
      return false;
    }
  }
  return true;
}
