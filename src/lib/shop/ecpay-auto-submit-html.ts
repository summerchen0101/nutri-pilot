import type { EcpayBridgePayloadResult } from '@/lib/shop/ecpay-bridge-types';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function assertCvsMapBridgeAction(action: string): void {
  const normalized = action.trim();
  if (!normalized.includes('/Express/map')) {
    throw new Error(
      '物流 bridge 非 V1 門市地圖（Express/map），請確認 Edge 已部署最新版',
    );
  }
  if (
    normalized.includes('/v2/') ||
    normalized.includes('LogisticsSelection') ||
    normalized.includes('RedirectToLogisticsSelection')
  ) {
    throw new Error(
      '偵測到 V2 物流選擇 URL，請重新部署 ecpay-logistics-selection',
    );
  }
}

export function buildEcpayAutoSubmitHtml(
  action: string,
  fields: Record<string, string>,
  title: string,
): string {
  const inputs = Object.entries(fields)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}" />`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <p style="font-family:system-ui,sans-serif;padding:24px;text-align:center;">正在導向，請稍候…</p>
  <form id="ecpayForm" method="post" action="${escapeHtml(action)}">
    ${inputs}
  </form>
  <script>document.getElementById('ecpayForm').submit();</script>
</body>
</html>`;
}

export function buildEcpayBridgeErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>無法開啟</title>
</head>
<body style="font-family:system-ui,sans-serif;padding:24px;text-align:center;">
  <p style="color:#E24B4A;">${escapeHtml(message)}</p>
  <p style="color:#666;font-size:14px;margin-top:16px;">請關閉此視窗返回 App 結帳</p>
</body>
</html>`;
}

export function buildEcpayBridgeRedirectHtml(url: string): string {
  const safeUrl = escapeHtml(url);
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=${safeUrl}" />
  <title>導向中</title>
</head>
<body>
  <p style="font-family:system-ui,sans-serif;padding:24px;text-align:center;">正在導向…</p>
  <a href="${safeUrl}">若未自動跳轉請點此</a>
</body>
</html>`;
}

export function bridgePayloadToAutoSubmitHtml(
  bridge: Extract<EcpayBridgePayloadResult, { ok: true }>,
  title: string,
): string {
  if ('redirectUrl' in bridge) {
    return buildEcpayBridgeRedirectHtml(bridge.redirectUrl);
  }
  if ('skipMap' in bridge && bridge.skipMap) {
    return buildEcpayBridgeErrorHtml('此訂單無需選擇門市');
  }
  if ('skipPayment' in bridge && bridge.skipPayment) {
    return buildEcpayBridgeErrorHtml('此訂單無需付款');
  }
  if ('fields' in bridge) {
    return buildEcpayAutoSubmitHtml(bridge.action, bridge.fields, title);
  }
  return buildEcpayBridgeErrorHtml('綠界回應格式不正確');
}
