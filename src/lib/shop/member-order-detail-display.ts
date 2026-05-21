import { logisticsSubtypeDisplayLabel } from '@/lib/ecpay/logistics-labels';
import { isCheckoutSnapshotLike } from '@/lib/shop/build-remaining-logistics-queue';
import {
  isCvsCodShippingCode,
  isCvsShippingCode,
  isHomeDeliveryCode,
} from '@/lib/shop/shipping-method-kind';

const ECPAY_PAYMENT_TYPE_LABELS: Record<string, string> = {
  Credit: '信用卡',
  WebATM: 'Web ATM',
  ATM: 'ATM 轉帳',
  CVS: '超商代碼繳費',
  BARCODE: '超商條碼繳費',
  ApplePay: 'Apple Pay',
  GooglePay: 'Google Pay',
  TWQR: 'TWQR',
  DigitalPayment_Jkopay: '街口支付',
  DigitalPayment_LinePay: 'LINE Pay',
  DigitalPayment_EasyWallet: '悠遊付',
  DigitalPayment_PiWallet: 'Pi 拍錢包',
};

export interface MemberOrderPaymentDisplay {
  label: string;
  pendingHint: string | null;
}

export interface MemberOrderFulfillmentRow {
  vendorId: string;
  vendorName: string;
  shippingLabel: string;
  storeName: string | null;
  storeAddress: string | null;
  homeAddress: string | null;
  isCvs: boolean;
  isCod: boolean;
}

interface LogisticsDraftLike {
  logisticsType?: string;
  logisticsSubType?: string;
  cvsStoreId?: string | null;
  cvsStoreName?: string | null;
  cvsStoreAddress?: string | null;
  shippingAddress?: string | null;
}

interface VendorSnapshotLike {
  vendorId: string;
  vendorName: string;
  shippingMethodLabel?: string | null;
  shippingMethodCode?: string | null;
}

interface SubOrderLogisticsLike {
  vendor_id?: string | null;
  logistics_type?: string | null;
  logistics_subtype?: string | null;
  cvs_store_name?: string | null;
  cvs_store_address?: string | null;
  shipping_address?: string | null;
}

function readEcpayMeta(orderMetadata: unknown): Record<string, unknown> | null {
  if (orderMetadata == null || typeof orderMetadata !== 'object') return null;
  const ecpay = (orderMetadata as Record<string, unknown>).ecpay;
  if (ecpay == null || typeof ecpay !== 'object') return null;
  return ecpay as Record<string, unknown>;
}

function readPaymentTypeFromParams(params: unknown): string | null {
  if (params == null || typeof params !== 'object') return null;
  const paymentType = (params as Record<string, unknown>).PaymentType;
  return typeof paymentType === 'string' && paymentType.trim().length > 0 ?
      paymentType.trim()
    : null;
}

export function ecpayPaymentTypeLabel(paymentType: string | null | undefined): string {
  if (!paymentType) return '—';
  const direct = ECPAY_PAYMENT_TYPE_LABELS[paymentType];
  if (direct) return direct;
  if (paymentType.startsWith('DigitalPayment_')) {
    const tail = paymentType.slice('DigitalPayment_'.length);
    return tail.length > 0 ? tail : '行動支付';
  }
  return paymentType;
}

export function snapshotHasCodVendor(checkoutSnapshot: unknown): boolean {
  if (!isCheckoutSnapshotLike(checkoutSnapshot)) return false;
  return (checkoutSnapshot.vendors ?? []).some((v) => {
    const code =
      v != null && typeof v === 'object' ?
        (v as { shippingMethodCode?: string | null }).shippingMethodCode
      : null;
    return isCvsCodShippingCode(code ?? null);
  });
}


export function resolveMemberOrderPaymentLabel(input: {
  status: string | null;
  paymentGateway: string | null;
  orderMetadata: unknown;
  checkoutSnapshot: unknown;
}): MemberOrderPaymentDisplay {
  const ecpay = readEcpayMeta(input.orderMetadata);
  const returnType = readPaymentTypeFromParams(ecpay?.returnCallback);
  const infoType = readPaymentTypeFromParams(ecpay?.paymentInfo);
  const paymentPending = ecpay?.paymentPending === true;

  if (ecpay?.zeroAmountCheckout === true) {
    return { label: '免線上付款', pendingHint: null };
  }

  if (returnType) {
    return {
      label: ecpayPaymentTypeLabel(returnType),
      pendingHint: null,
    };
  }

  if (infoType) {
    return {
      label: ecpayPaymentTypeLabel(infoType),
      pendingHint: paymentPending ? '待完成繳費，入帳後訂單將自動成立' : null,
    };
  }

  if (snapshotHasCodVendor(input.checkoutSnapshot)) {
    return { label: '到店支付', pendingHint: null };
  }

  if (input.paymentGateway === 'ecpay' && input.status === 'pending') {
    return {
      label: '線上付款（綠界金流）',
      pendingHint: paymentPending ? '待完成繳費，入帳後訂單將自動成立' : null,
    };
  }

  if (input.paymentGateway === 'ecpay') {
    return { label: '線上付款（綠界金流）', pendingHint: null };
  }

  return { label: '—', pendingHint: null };
}

function resolveShippingLabel(
  vendor: VendorSnapshotLike,
  draft: LogisticsDraftLike | null | undefined,
): string {
  const methodLabel = vendor.shippingMethodLabel?.trim();
  if (methodLabel) return methodLabel;

  const code = vendor.shippingMethodCode ?? null;
  if (isCvsCodShippingCode(code)) return '7-11 取貨付款';
  if (isCvsShippingCode(code)) {
    const subtype = draft?.logisticsSubType ?? null;
    const brand = logisticsSubtypeDisplayLabel(subtype);
    return brand !== '—' ? `超商－${brand}取貨` : '超商取貨';
  }
  if (isHomeDeliveryCode(code)) {
    const subtype = draft?.logisticsSubType ?? null;
    if (subtype === 'TCAT') return '黑貓宅配';
    if (subtype === 'POST') return '郵局宅配';
    return '宅配';
  }

  return '—';
}

export function resolveMemberOrderVendorFulfillment(
  vendor: VendorSnapshotLike,
  draft: LogisticsDraftLike | null | undefined,
  subOrder: SubOrderLogisticsLike | null | undefined,
  recipientAddressFull: string | null,
): Omit<MemberOrderFulfillmentRow, 'vendorId' | 'vendorName'> {
  const code = vendor.shippingMethodCode ?? null;
  const isCvs = draft?.logisticsType === 'CVS' || isCvsShippingCode(code);
  const isCod = isCvsCodShippingCode(code);

  const storeName =
    (subOrder?.cvs_store_name?.trim() || draft?.cvsStoreName?.trim() || '') || null;
  const storeAddress =
    (subOrder?.cvs_store_address?.trim() || draft?.cvsStoreAddress?.trim() || '') ||
    null;

  const homeAddress =
    !isCvs ?
      (
        recipientAddressFull?.trim() ||
        subOrder?.shipping_address?.trim() ||
        draft?.shippingAddress?.trim() ||
        ''
      ) || null
    : null;

  return {
    shippingLabel: resolveShippingLabel(vendor, draft),
    storeName: isCvs ? storeName : null,
    storeAddress: isCvs ? storeAddress : null,
    homeAddress,
    isCvs,
    isCod,
  };
}

export function buildMemberOrderFulfillmentRows(input: {
  checkoutSnapshot: unknown;
  subOrders: SubOrderLogisticsLike[];
  recipientAddressFull: string | null;
}): MemberOrderFulfillmentRow[] {
  if (!isCheckoutSnapshotLike(input.checkoutSnapshot)) return [];

  const subByVendor = new Map<string, SubOrderLogisticsLike>();
  for (const sub of input.subOrders) {
    const vid = sub.vendor_id?.trim();
    if (vid) subByVendor.set(vid, sub);
  }

  const snap = input.checkoutSnapshot as {
    vendors?: VendorSnapshotLike[];
    logisticsByVendor?: Record<string, LogisticsDraftLike | null>;
  };

  return (snap.vendors ?? []).map((vendor) => {
    const draft = snap.logisticsByVendor?.[vendor.vendorId] ?? null;
    const sub = subByVendor.get(vendor.vendorId);
    const fulfillment = resolveMemberOrderVendorFulfillment(
      vendor,
      draft,
      sub,
      input.recipientAddressFull,
    );

    return {
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      ...fulfillment,
    };
  });
}