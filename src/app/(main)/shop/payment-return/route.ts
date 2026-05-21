/**
 * 本機手動測試用（GET 帶 RtnCode、CustomField1 等 query）。
 * 不可作為綠界 OrderResultURL：/shop/* 受 auth middleware 保護，
 * 綠界跨站 POST 不帶 session cookie，會 302 到 /login。
 * 瀏覽器回傳請用 Edge `ecpay-order-result`（verify_jwt=false）。
 */
import { buildPopupReturnHtml } from '@/lib/shop/ecpay-popup-return-html';

function buildRedirectUrl(params: URLSearchParams): string {
  const orderId = params.get('CustomField1')?.trim() ?? '';
  const rtnCode = params.get('RtnCode')?.trim() ?? '';
  const merchantOrderNo = params.get('MerchantTradeNo')?.trim() ??
    params.get('merchant_order_no')?.trim() ?? '';
  const paymentType = params.get('PaymentType')?.trim() ?? '';

  const pendingPayment =
    rtnCode === '1' && (paymentType === 'ATM' || paymentType === 'CVS');

  if (rtnCode !== '1') {
    const failParams = new URLSearchParams();
    failParams.set('checkout', '1');
    failParams.set('paymentFailed', '1');
    if (orderId) failParams.set('orderId', orderId);
    if (rtnCode) failParams.set('rtnCode', rtnCode);
    return `/shop?${failParams.toString()}`;
  }

  const paymentDoneParams = new URLSearchParams();
  paymentDoneParams.set('checkout', '1');
  paymentDoneParams.set('paymentDone', '1');
  if (orderId) paymentDoneParams.set('orderId', orderId);
  paymentDoneParams.set('rtnCode', '1');
  if (pendingPayment) {
    paymentDoneParams.set('paymentPending', '1');
    if (merchantOrderNo) {
      paymentDoneParams.set('merchant_order_no', merchantOrderNo);
    }
  }

  return `/shop?${paymentDoneParams.toString()}`;
}

function respondFromEcpayParams(params: URLSearchParams): Response {
  const html = buildPopupReturnHtml({
    redirectUrl: buildRedirectUrl(params),
    navigateOpener: true,
  });

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function parseEcpayCallbackParams(
  request: Request,
): Promise<URLSearchParams> {
  if (request.method === 'POST') {
    const text = await request.text();
    if (text.trim()) {
      return new URLSearchParams(text);
    }
  }
  return new URL(request.url).searchParams;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return respondFromEcpayParams(params);
}

export async function POST(request: Request) {
  const params = await parseEcpayCallbackParams(request);
  return respondFromEcpayParams(params);
}
