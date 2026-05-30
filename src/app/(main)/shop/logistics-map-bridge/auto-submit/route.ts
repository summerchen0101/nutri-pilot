import { NextResponse } from 'next/server';

import {
  assertCvsMapBridgeAction,
  bridgePayloadToAutoSubmitHtml,
  buildEcpayBridgeErrorHtml,
} from '@/lib/shop/ecpay-auto-submit-html';
import { fetchEcpayLogisticsSelectionBridge } from '@/lib/shop/ecpay-bridge-fetch';
import { buildPopupReturnHtml } from '@/lib/shop/ecpay-popup-return-html';
import { resolveRequestAppOrigin } from '@/lib/shop/resolve-request-app-origin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId')?.trim() ?? '';
  const vendorId = url.searchParams.get('vendorId')?.trim() ?? '';
  const accessToken = url.searchParams.get('token')?.trim() ?? '';
  const nativeReturn = url.searchParams.get('nativeReturn') === '1';

  if (!orderId || !vendorId) {
    return new NextResponse(buildEcpayBridgeErrorHtml('缺少訂單或店家資訊'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const bridge = await fetchEcpayLogisticsSelectionBridge(
    {
      orderId,
      vendorId,
      appOrigin: await resolveRequestAppOrigin(),
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

  if ('skipMap' in bridge && bridge.skipMap) {
    const params = new URLSearchParams({
      checkout: '1',
      orderId,
      logisticsDone: '1',
      vendorId,
    });
    const redirectUrl = nativeReturn ?
      `nutriguard://shop?${params.toString()}`
    : `/shop?${params.toString()}`;
    if (nativeReturn) {
      return new NextResponse(
        buildPopupReturnHtml({ redirectUrl }),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  try {
    if ('fields' in bridge) {
      assertCvsMapBridgeAction(bridge.action);
    }
    const html = bridgePayloadToAutoSubmitHtml(bridge, '綠界超商門市選擇');
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '無法開啟門市地圖';
    return new NextResponse(buildEcpayBridgeErrorHtml(message), {
      status: 422,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
