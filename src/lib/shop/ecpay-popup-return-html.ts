function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPopupReturnHtml(options: {
  redirectUrl: string;
  closePopup?: boolean;
  /** false：物流回傳僅關 popup，主視窗維持結帳流程 */
  navigateOpener?: boolean;
}): string {
  const { redirectUrl, closePopup = true, navigateOpener = true } = options;
  const safeUrl = JSON.stringify(redirectUrl);
  const closeScript = !closePopup ?
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
      var targetOrigin = '*';
      try {
        if (url.indexOf('http') === 0) {
          targetOrigin = new URL(url).origin;
        }
      } catch (_) {}
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(
            { type: 'nutri-pilot:ecpay-return', url: url },
            targetOrigin,
          );
        } catch (_) {}
        var openerNavigated = false;
        try {
          window.opener.location.href = url;
          openerNavigated = true;
        } catch (_) {}
        if (openerNavigated) {
          window.close();
          return;
        }
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
