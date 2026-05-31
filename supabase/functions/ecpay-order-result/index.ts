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
import {
  buildShopReturnUrl,
  isNativeReturnRequested,
} from "../_shared/native-app-return.ts";

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
  nativeReturn: boolean,
): string {
  const orderId = params.CustomField1 ?? "";
  const rtnCode = params.RtnCode ?? "";
  const merchantTradeNo = params.MerchantTradeNo ?? "";
  const pending = params.PaymentType === "ATM" || params.PaymentType === "CVS";

  if (rtnCode !== "1") {
    return buildShopReturnUrl(
      appOrigin,
      {
        checkout: "1",
        paymentFailed: "1",
        ...(orderId ? { orderId } : {}),
        ...(rtnCode ? { rtnCode } : {}),
      },
      nativeReturn,
    );
  }

  const shopParams: Record<string, string> = {
    checkout: "1",
    paymentDone: "1",
    rtnCode: "1",
  };
  if (orderId) shopParams.orderId = orderId;
  if (pending) {
    shopParams.paymentPending = "1";
    if (merchantTradeNo) {
      shopParams.merchant_order_no = merchantTradeNo;
    }
  }

  return buildShopReturnUrl(appOrigin, shopParams, nativeReturn);
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

  const reqUrl = new URL(req.url);
  const appOrigin = resolveAppOrigin(req);
  const nativeReturn = isNativeReturnRequested(reqUrl);
  const redirectUrl = buildOpenerRedirectUrl(appOrigin, params, nativeReturn);

  return new Response(buildPopupReturnHtml({ redirectUrl }), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
