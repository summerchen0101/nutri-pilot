import { isAbortError, sleepMs } from '@/lib/shop/abortable-sleep';
import { fetchOrderLogisticsDraft } from '@/lib/shop/order-logistics-snapshot';

const POLL_MS = 500;
const DEFAULT_TIMEOUT_MS = 15000;

export type WaitForStoreSelectedResult =
  | { ok: true }
  | { ok: false; aborted?: boolean };

export async function waitForStoreSelected(
  orderId: string,
  vendorId: string,
  options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<WaitForStoreSelectedResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.ceil(timeoutMs / POLL_MS);
  const signal = options?.signal;

  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal?.aborted) {
        return { ok: false, aborted: true };
      }

      const draft = await fetchOrderLogisticsDraft(orderId, vendorId);
      if (draft?.storeSelected && draft.cvsStoreId) {
        return { ok: true };
      }

      await sleepMs(POLL_MS, signal);
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      return { ok: false, aborted: true };
    }
    throw error;
  }

  return { ok: false };
}
