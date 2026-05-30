'use client';

import { fetchEcpayLogisticsSelectionPayload } from '@/app/(main)/shop/actions';
import { EcpayBridgePageShell } from '@/components/shop/ecpay-bridge-page-shell';
import { assertCvsMapBridgeAction } from '@/lib/shop/ecpay-auto-submit-html';

export interface LogisticsMapBridgeClientProps {
  orderId: string;
  vendorId: string;
}

export function LogisticsMapBridgeClient({
  orderId,
  vendorId,
}: LogisticsMapBridgeClientProps) {
  if (!orderId || !vendorId) {
    return (
      <EcpayBridgePageShell
        orderId={orderId || 'unknown'}
        bridgeKind="logistics"
        loadingMessage="正在導向綠界門市地圖…"
        onFetchBridge={async () => ({ ok: false, error: '缺少訂單或店家資訊' })}
      />
    );
  }

  return (
    <EcpayBridgePageShell
      orderId={orderId}
      bridgeKind="logistics"
      loadingMessage="正在導向綠界門市地圖…"
      onFetchBridge={async () => {
        const bridge = await fetchEcpayLogisticsSelectionPayload({
          orderId,
          vendorId,
          clientOrigin: window.location.origin,
        });
        if (!bridge.ok) {
          return { ok: false, error: bridge.error };
        }
        if ('skipMap' in bridge && bridge.skipMap) {
          const params = new URLSearchParams({
            checkout: '1',
            orderId,
            logisticsDone: '1',
            vendorId,
          });
          return {
            ok: true,
            skip: true,
            redirectPath: `/shop?${params.toString()}`,
          };
        }
        if ('redirectUrl' in bridge) {
          return { ok: true, bridge };
        }
        if (!('fields' in bridge)) {
          return { ok: false, error: '綠界回應格式不正確' };
        }
        try {
          assertCvsMapBridgeAction(bridge.action);
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : '無法開啟門市地圖',
          };
        }
        return { ok: true, bridge };
      }}
    />
  );
}
