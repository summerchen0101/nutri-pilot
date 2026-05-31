import { fetchOrderCheckoutVendorId } from '@/lib/shop/order-logistics-snapshot';
import { waitForLogisticsCreated } from '@/lib/shop/wait-for-logistics-created';
import { waitForOrderPaid } from '@/lib/shop/wait-for-order-paid';
import { useCartStore } from '@/lib/shop/cart-store';

export function buildShopSuccessPath(
  orderId: string,
  merchantOrderNo: string,
  paymentPending: boolean,
  vendorId?: string | null,
): string {
  const params = new URLSearchParams();
  if (paymentPending) params.set('paymentPending', '1');
  params.set('order_id', orderId);
  if (merchantOrderNo) params.set('merchant_order_no', merchantOrderNo);
  if (vendorId) params.set('vendor_id', vendorId);
  return `/shop/success?${params.toString()}`;
}

export type PaymentCompleteOutcome =
  | 'success'
  | 'pending_only'
  | 'awaiting_payment'
  | 'awaiting_logistics';

export async function completePaidCheckoutToSuccess(
  orderId: string,
  merchantOrderNo: string,
  paymentPending: boolean,
): Promise<PaymentCompleteOutcome> {
  if (paymentPending) {
    return 'pending_only';
  }

  const vendorId = await fetchOrderCheckoutVendorId(orderId);
  if (!vendorId) {
    return 'pending_only';
  }

  const paid = await waitForOrderPaid(orderId, { timeoutMs: 60000 });
  if (paid.status !== 'paid') {
    return 'awaiting_payment';
  }

  const logistics = await waitForLogisticsCreated(orderId, vendorId, {
    timeoutMs: 90000,
  });
  if (!logistics.ok) {
    return 'awaiting_logistics';
  }

  useCartStore.getState().setLastCheckedOutVendorId(vendorId);
  return 'success';
}

export interface ResolvePaymentCompleteParams {
  orderId: string;
  rtnCode?: string;
  paymentPending?: boolean;
  merchantOrderNo?: string;
}

/** 依綠界回跳參數決定完成頁或回到結帳 */
export async function resolvePaymentCompleteDestination(
  params: ResolvePaymentCompleteParams,
): Promise<
  | { kind: 'success'; path: string }
  | { kind: 'checkout'; error: string }
> {
  const orderId = params.orderId.trim();
  const rtnCode = params.rtnCode?.trim() ?? '';
  const urlPaymentPending = params.paymentPending === true;
  let merchantOrderNo = params.merchantOrderNo?.trim() ?? '';

  const goSuccess = async (
    merchantNo: string,
    paymentPending: boolean,
  ): Promise<
    | { kind: 'success'; path: string }
    | { kind: 'checkout'; error: string }
  > => {
    const vendorId = await fetchOrderCheckoutVendorId(orderId);
    const outcome = await completePaidCheckoutToSuccess(
      orderId,
      merchantNo,
      paymentPending,
    );

    if (outcome === 'awaiting_payment') {
      return {
        kind: 'checkout',
        error: '付款結果確認中，請稍後再試或至訂單紀錄查看',
      };
    }
    if (outcome === 'awaiting_logistics') {
      return {
        kind: 'checkout',
        error: '付款已完成，物流單建立中，請稍候…',
      };
    }

    return {
      kind: 'success',
      path: buildShopSuccessPath(orderId, merchantNo, paymentPending, vendorId),
    };
  };

  if (urlPaymentPending) {
    return goSuccess(merchantOrderNo, true);
  }

  if (rtnCode === '1') {
    return goSuccess(merchantOrderNo, false);
  }

  const result = await waitForOrderPaid(orderId);
  merchantOrderNo = result.merchantOrderNo ?? merchantOrderNo;

  if (result.status === 'paid') {
    return goSuccess(merchantOrderNo, false);
  }

  if (result.status === 'pending_payment') {
    return goSuccess(merchantOrderNo, true);
  }

  return {
    kind: 'checkout',
    error: '付款結果確認中，請稍後再試或至訂單紀錄查看',
  };
}
