'use client';

const POPUP_FEATURES = 'width=520,height=720,scrollbars=yes,resizable=yes';

export const ECPAY_LOGISTICS_POPUP_NAME = 'ecpay-logistics';
export const ECPAY_PAYMENT_POPUP_NAME = 'ecpay-payment';

export interface EcpayFormPayload {
  action: string;
  fields: Record<string, string>;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openEcpayPopup(name: string): Window | null {
  return window.open('about:blank', name, POPUP_FEATURES);
}

/** 僅在 popup 仍為同源（about:blank）時可用 */
export function showPopupMessage(popup: Window, message: string): void {
  if (popup.closed) return;
  try {
    const doc = popup.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8" /><title>NutriPilot</title></head>
<body style="font-family:system-ui,sans-serif;padding:24px;text-align:center;color:#333;">
  <p>${escapeHtml(message)}</p>
</body>
</html>`);
    doc.close();
  } catch {
    /* 跨域後無法寫入 — 忽略 */
  }
}

/** 由主視窗 form.target 提交，popup 跨域後仍可繼續導向 */
export function submitPostFormToNamedPopup(
  popupName: string,
  payload: EcpayFormPayload,
): void {
  const form = document.createElement('form');
  form.method = 'post';
  form.action = payload.action;
  form.target = popupName;
  form.style.display = 'none';

  for (const [name, value] of Object.entries(payload.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

/** 同名 popup 已存在時會導向該視窗（跨域安全） */
export function navigateNamedPopup(
  popupName: string,
  url: string,
): Window | null {
  return window.open(url, popupName, POPUP_FEATURES);
}

export function submitPostFormInPopup(
  popup: Window,
  payload: EcpayFormPayload,
): void {
  const doc = popup.document;
  const form = doc.createElement('form');
  form.method = 'post';
  form.action = payload.action;

  for (const [name, value] of Object.entries(payload.fields)) {
    const input = doc.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  doc.body.appendChild(form);
  form.submit();
}

export function navigatePopup(popup: Window, url: string): void {
  popup.location.href = url;
}

/** 超商 V1 門市地圖須 POST 至 Express/map，不可為 V2 物流選擇頁 */
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

export function submitLogisticsMapBridgeToNamedPopup(
  popupName: string,
  bridge: { ok: true; action: string; fields: Record<string, string> } | {
    ok: true;
    redirectUrl: string;
  },
): void {
  if ('redirectUrl' in bridge) {
    navigateNamedPopup(popupName, bridge.redirectUrl);
    return;
  }
  assertCvsMapBridgeAction(bridge.action);
  submitPostFormToNamedPopup(popupName, {
    action: bridge.action,
    fields: bridge.fields,
  });
}

/** 金流 AIO：不可套用門市地圖 URL 檢查 */
export function submitPaymentBridgeToNamedPopup(
  popupName: string,
  bridge: { ok: true; action: string; fields: Record<string, string> } | {
    ok: true;
    redirectUrl: string;
  },
): void {
  if ('redirectUrl' in bridge) {
    navigateNamedPopup(popupName, bridge.redirectUrl);
    return;
  }
  submitPostFormToNamedPopup(popupName, {
    action: bridge.action,
    fields: bridge.fields,
  });
}

/** @deprecated 請改用 submitLogisticsMapBridgeToNamedPopup 或 submitPaymentBridgeToNamedPopup */
export function submitBridgeToNamedPopup(
  popupName: string,
  bridge: { ok: true; action: string; fields: Record<string, string> } | {
    ok: true;
    redirectUrl: string;
  },
): void {
  submitLogisticsMapBridgeToNamedPopup(popupName, bridge);
}

export function submitBridgeToPopup(
  popup: Window,
  bridge: { ok: true; action: string; fields: Record<string, string> } | {
    ok: true;
    redirectUrl: string;
  },
): void {
  if ('redirectUrl' in bridge) {
    navigatePopup(popup, bridge.redirectUrl);
    return;
  }
  submitPostFormInPopup(popup, {
    action: bridge.action,
    fields: bridge.fields,
  });
}
