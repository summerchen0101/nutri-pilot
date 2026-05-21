export function buildAutoSubmitFormHtml(
  action: string,
  fields: Record<string, string>,
  title = "導向綠界",
): string {
  const inputs = Object.entries(fields)
    .map(([k, v]) =>
      `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}" />`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <p>正在導向，請稍候…</p>
  <form id="ecpayForm" method="post" action="${escapeHtml(action)}">
    ${inputs}
    <p><button type="submit">前往綠界</button></p>
  </form>
  <script>document.getElementById('ecpayForm').submit();</script>
</body>
</html>`;
}

export function buildPopupReturnHtml(options: {
  redirectUrl: string;
  closePopup?: boolean;
  /** false：物流回傳僅關 popup，主視窗維持結帳流程 */
  navigateOpener?: boolean;
  /** true：保留 popup 供主視窗以 form.target 繼續下一段物流 */
  reusePopup?: boolean;
}): string {
  const {
    redirectUrl,
    closePopup = true,
    navigateOpener = true,
    reusePopup = false,
  } = options;
  const safeUrl = JSON.stringify(redirectUrl);
  const closeScript = reusePopup ?
    `
    if (window.opener && !window.opener.closed) {
      document.body.innerHTML = '<p style="font-family:system-ui,sans-serif;padding:24px;text-align:center;">物流設定完成，請回到主視窗繼續…</p>';
    } else {
      window.location.href = ${safeUrl};
    }
  `
  : !closePopup ?
    `window.location.href = ${safeUrl};`
  : !navigateOpener ?
    `
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      window.location.href = ${safeUrl};
    }
  `
  : `
    (function () {
      var url = ${safeUrl};
      var msg = { type: 'nutri-pilot:ecpay-return', url: url };
      var targetOrigin = '*';
      try {
        if (url.indexOf('http') === 0) {
          targetOrigin = new URL(url).origin;
        }
      } catch (_) {}
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(msg, targetOrigin);
        } catch (_) {}
        try {
          window.opener.postMessage(msg, '*');
        } catch (_) {}
        setTimeout(function () {
          try { window.close(); } catch (_) {}
        }, 400);
        return;
      }
      window.location.href = url;
    })();
  `;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8" /><title>完成</title></head>
<body>
  <p>處理完成，正在返回…</p>
  <p><a href="${escapeHtml(redirectUrl)}">返回商城</a></p>
  <script>${closeScript}</script>
</body>
</html>`;
}

export function buildLogisticsErrorHtml(
  message: string,
  backUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>物流設定失敗</title>
</head>
<body>
  <p>物流設定失敗：${escapeHtml(message)}</p>
  <p><a href="${escapeHtml(backUrl)}">返回商城</a></p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
