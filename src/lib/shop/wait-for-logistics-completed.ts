import { createClient } from '@/lib/supabase/client';

const POLL_MS = 500;
const DEFAULT_TIMEOUT_MS = 15000;

export async function waitForVendorLogisticsCompleted(
  orderId: string,
  vendorId: string,
  options?: { timeoutMs?: number },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.ceil(timeoutMs / POLL_MS);
  const supabase = createClient();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: order } = await supabase
      .from('orders')
      .select('checkout_snapshot')
      .eq('id', orderId)
      .maybeSingle();

    const snap = order?.checkout_snapshot;
    if (snap != null && typeof snap === 'object' && !Array.isArray(snap)) {
      const byVendor = (snap as Record<string, unknown>).logisticsByVendor;
      if (byVendor != null && typeof byVendor === 'object') {
        const draft = (byVendor as Record<string, unknown>)[vendorId];
        if (
          draft != null &&
          typeof draft === 'object' &&
          (draft as Record<string, unknown>).completed === true
        ) {
          return true;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  return false;
}
