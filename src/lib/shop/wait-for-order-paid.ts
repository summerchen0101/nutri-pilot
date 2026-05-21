import { createClient } from '@/lib/supabase/client';

const DEFAULT_POLL_MS = 500;
const DEFAULT_TIMEOUT_MS = 30000;

export type OrderPaidPollStatus = 'paid' | 'pending_payment' | 'timeout';

export interface WaitForOrderPaidResult {
  status: OrderPaidPollStatus;
  merchantOrderNo?: string;
}

function isPaymentPending(metadata: unknown): boolean {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  const ecpay = (metadata as Record<string, unknown>).ecpay;
  return (
    ecpay != null &&
    typeof ecpay === 'object' &&
    (ecpay as Record<string, unknown>).paymentPending === true
  );
}

export async function waitForOrderPaid(
  orderId: string,
  options?: { timeoutMs?: number; pollMs?: number },
): Promise<WaitForOrderPaidResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS;
  const maxAttempts = Math.ceil(timeoutMs / pollMs);
  const supabase = createClient();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: order } = await supabase
      .from('orders')
      .select('status, order_metadata, merchant_order_no')
      .eq('id', orderId)
      .maybeSingle();

    if (order?.status === 'paid') {
      const merchantOrderNo =
        typeof order.merchant_order_no === 'string' ?
          order.merchant_order_no
        : undefined;
      return { status: 'paid', merchantOrderNo };
    }

    if (isPaymentPending(order?.order_metadata)) {
      const merchantOrderNo =
        typeof order?.merchant_order_no === 'string' ?
          order.merchant_order_no
        : undefined;
      return { status: 'pending_payment', merchantOrderNo };
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return { status: 'timeout' };
}
