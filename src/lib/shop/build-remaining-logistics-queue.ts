import type { LogisticsQueueItem } from '@/lib/shop/use-ecpay-checkout-flow';

interface LogisticsDraftLike {
  logisticsType?: string;
  logisticsSubType?: string;
  completed?: boolean;
}

interface CheckoutSnapshotLike {
  vendors?: Array<{ vendorId: string; vendorName: string }>;
  logisticsByVendor?: Record<string, LogisticsDraftLike | null>;
  logisticsCompleted?: boolean;
}

export function isCheckoutSnapshotLike(
  value: unknown,
): value is CheckoutSnapshotLike {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const snap = value as CheckoutSnapshotLike;
  return Array.isArray(snap.vendors);
}

export function buildRemainingLogisticsQueue(
  snap: CheckoutSnapshotLike,
): LogisticsQueueItem[] {
  const queue: LogisticsQueueItem[] = [];
  for (const vendor of snap.vendors ?? []) {
    const draft = snap.logisticsByVendor?.[vendor.vendorId];
    if (!draft || draft.completed === true) continue;
    if (draft.logisticsType !== 'CVS' && draft.logisticsType !== 'HOME') {
      continue;
    }
    if (typeof draft.logisticsSubType !== 'string' || !draft.logisticsSubType) {
      continue;
    }
    queue.push({
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      logisticsType: draft.logisticsType,
      logisticsSubType: draft.logisticsSubType,
    });
  }
  return queue;
}
