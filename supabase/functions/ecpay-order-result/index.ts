/**
 * POST — 綠界 OrderResultURL（瀏覽器 popup 返回）
 */
import {
  getAppUrl,
  getEcpayPaymentConfig,
  parseEcpayFormBody,
  verifyEcpayCheckMacValue,
} from "../_shared/ecpay.ts";
import { buildPopupReturnHtml } from "../_shared/ecpay-popup-html.ts";

function resolveAppOrigin(req: Request): string {
  const fromQuery = new URL(req.url).searchParams.get("appOrigin")?.trim() ??
    "";
  if (fromQuery && /^https?:\/\//i.test(fromQuery)) {
    return fromQuery.replace(/\/$/, "");
  }
  return getAppUrl().replace(/\/$/, "");
}

function buildOpenerRedirectUrl(
  appOrigin: string,
  params: Record<string, string>,
): string {
  const orderId = params.CustomField1 ?? "";
  const rtnCode = params.RtnCode ?? "";
  const merchantTradeNo = params.MerchantTradeNo ?? "";
  const pending = params.PaymentType === "ATM" || params.PaymentType === "CVS";

  if (rtnCode !== "1") {
    const failParams = new URLSearchParams();
    failParams.set("checkout", "1");
    failParams.set("paymentFailed", "1");
    if (orderId) failParams.set("orderId", orderId);
    if (rtnCode) failParams.set("rtnCode", rtnCode);
    return `${appOrigin}/shop?${failParams.toString()}`;
  }

  const paymentDoneParams = new URLSearchParams();
  paymentDoneParams.set("checkout", "1");
  paymentDoneParams.set("paymentDone", "1");
  if (orderId) paymentDoneParams.set("orderId", orderId);
  paymentDoneParams.set("rtnCode", "1");
  if (pending) {
    paymentDoneParams.set("paymentPending", "1");
    if (merchantTradeNo) {
      paymentDoneParams.set("merchant_order_no", merchantTradeNo);
    }
  }

  return `${appOrigin}/shop?${paymentDoneParams.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const pay = getEcpayPaymentConfig();
  const raw = req.method === "POST" ? await req.text() : new URL(req.url).search
    .slice(1);
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.includes("\"Data\"")) {
    console.warn(
      "[ecpay-order-result] envelope-style callback detected; flat CheckMac expected",
    );
  }
  const params = parseEcpayFormBody(raw);

  if (!verifyEcpayCheckMacValue(params, pay.hashKey, pay.hashIv, true)) {
    return new Response("CheckMac Error", { status: 400 });
  }

  const appOrigin = resolveAppOrigin(req);
  const redirectUrl = buildOpenerRedirectUrl(appOrigin, params);

  return new Response(buildPopupReturnHtml({ redirectUrl }), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
