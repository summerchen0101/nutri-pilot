import { isVendorPostPaymentReady } from '@/lib/shop/checkout-logistics-ready';
import { readLogisticsCreateError } from '@/lib/shop/order-logistics-snapshot';
import { createAbortError, isAbortError, sleepMs } from '@/lib/shop/abortable-sleep';
import { isHomeDeliveryCode } from '@/lib/shop/shipping-method-kind';
import { createClient } from '@/lib/supabase/client';

const POLL_MS = 500;
const DEFAULT_TIMEOUT_MS = 60000;

export type WaitForLogisticsCreatedResult =
  | { ok: true }
  | { ok: false; error: string; aborted?: false }
  | { ok: false; aborted: true };

function readVendorDraft(
  snap: unknown,
  vendorId: string,
): Record<string, unknown> | null {
  if (snap == null || typeof snap !== 'object' || Array.isArray(snap)) {
    return null;
  }
  const byVendor = (snap as Record<string, unknown>).logisticsByVendor;
  if (byVendor == null || typeof byVendor !== 'object') return null;
  const draft = (byVendor as Record<string, unknown>)[vendorId];
  if (draft == null || typeof draft !== 'object') return null;
  return draft as Record<string, unknown>;
}

function readVendorShippingMethod(
  snap: unknown,
  vendorId: string,
): string | null {
  if (snap == null || typeof snap !== 'object' || Array.isArray(snap)) {
    return null;
  }
  const vendors = (snap as Record<string, unknown>).vendors;
  if (!Array.isArray(vendors)) return null;
  for (const vendor of vendors) {
    if (vendor == null || typeof vendor !== 'object') continue;
    const record = vendor as Record<string, unknown>;
    if (record.vendorId !== vendorId) continue;
    return typeof record.shippingMethodCode === 'string' ?
        record.shippingMethodCode
      : null;
  }
  return null;
}

export async function waitForLogisticsCreated(
  orderId: string,
  vendorId: string,
  options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<WaitForLogisticsCreatedResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.ceil(timeoutMs / POLL_MS);
  const supabase = createClient();
  const signal = options?.signal;

  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal?.aborted) {
        return { ok: false, aborted: true };
      }

      const { data: order } = await supabase
        .from('orders')
        .select('checkout_snapshot')
        .eq('id', orderId)
        .maybeSingle();

      const snap = order?.checkout_snapshot;
      const draft = readVendorDraft(snap, vendorId);
      const shippingMethodCode = readVendorShippingMethod(snap, vendorId);
      const waitsForLogisticsCreated =
        !isHomeDeliveryCode(shippingMethodCode) &&
        draft?.logisticsType !== 'HOME';

      if (isVendorPostPaymentReady(draft, shippingMethodCode)) {
        return { ok: true };
      }

      const createError = waitsForLogisticsCreated ?
          readLogisticsCreateError(draft)
        : null;
      if (createError) {
        return { ok: false, error: createError };
      }

      await sleepMs(POLL_MS, signal);
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      return { ok: false, aborted: true };
    }
    throw error;
  }

  return {
    ok: false,
    error: '物流單建立逾時，請至訂單紀錄查看或聯絡客服',
  };
}