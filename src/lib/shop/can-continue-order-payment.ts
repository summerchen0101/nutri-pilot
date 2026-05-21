import { isCheckoutSnapshotLike } from '@/lib/shop/build-remaining-logistics-queue';

export function canContinueOrderPayment(
  status: string | null | undefined,
  checkoutSnapshot: unknown,
): boolean {
  if (status !== 'pending') return false;
  if (!isCheckoutSnapshotLike(checkoutSnapshot)) return false;
  return checkoutSnapshot.logisticsCompleted === true;
}
