'use client';

import { fetchEcpayCheckoutPayload } from '@/app/(main)/shop/actions';
import { EcpayBridgePageShell } from '@/components/shop/ecpay-bridge-page-shell';

export interface PaymentBridgeClientProps {
  orderId: string;
}

export function PaymentBridgeClient({ orderId }: PaymentBridgeClientProps) {
  if (!orderId) {
    return (
      <EcpayBridgePageShell
        orderId="unknown"
        bridgeKind="payment"
        loadingMessage="正在導向綠界付款…"
        onFetchBridge={async () => ({ ok: false, error: '缺少訂單編號' })}
      />
    );
  }

  return (
    <EcpayBridgePageShell
      orderId={orderId}
      bridgeKind="payment"
      loadingMessage="正在導向綠界付款…"
      stuckMessage="若已在外部瀏覽器開啟綠界付款，請完成後返回；若未開啟，請重試或返回結帳。"
      onFetchBridge={async () => {
        const bridge = await fetchEcpayCheckoutPayload({
          orderId,
          clientOrigin: window.location.origin,
        });
        if (!bridge.ok) {
          return { ok: false, error: bridge.error };
        }
        if ('skipPayment' in bridge && bridge.skipPayment) {
          return { ok: false, error: '此訂單無需付款' };
        }
        return { ok: true, bridge };
      }}
    />
  );
}
