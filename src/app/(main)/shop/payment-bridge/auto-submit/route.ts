import { NextResponse } from 'next/server';

import {
  bridgePayloadToAutoSubmitHtml,
  buildEcpayBridgeErrorHtml,
} from '@/lib/shop/ecpay-auto-submit-html';
import { fetchEcpayPaymentBridge } from '@/lib/shop/ecpay-bridge-fetch';
import { resolveRequestAppOrigin } from '@/lib/shop/resolve-request-app-origin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId')?.trim() ?? '';
  const accessToken = url.searchParams.get('token')?.trim() ?? '';
  const nativeReturn = url.searchParams.get('nativeReturn') === '1';

  if (!orderId) {
    return new NextResponse(buildEcpayBridgeErrorHtml('缺少訂單編號'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const appOrigin = await resolveRequestAppOrigin();
  const bridge = await fetchEcpayPaymentBridge(
    {
      orderId,
      clientOrigin: appOrigin,
      nativeReturn,
    },
    accessToken || undefined,
  );

  if (!bridge.ok) {
    return new NextResponse(buildEcpayBridgeErrorHtml(bridge.error), {
      status: 422,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if ('skipPayment' in bridge && bridge.skipPayment) {
    return new NextResponse(
      buildEcpayBridgeErrorHtml('此訂單無需付款，請關閉視窗返回 App'),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }

  const html = bridgePayloadToAutoSubmitHtml(bridge, '綠界付款');
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
