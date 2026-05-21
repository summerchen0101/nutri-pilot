import { isCheckoutLogisticsReadyForPayment } from '@/lib/shop/checkout-logistics-ready';
import { snapshotHasCodVendor } from '@/lib/shop/member-order-detail-display';

export function canContinueOrderPayment(
  status: string | null | undefined,
  checkoutSnapshot: unknown,
): boolean {
  if (status !== 'pending') return false;
  if (snapshotHasCodVendor(checkoutSnapshot)) return false;
  return isCheckoutLogisticsReadyForPayment(checkoutSnapshot);
}
