/**
 * GET ?orderId=&token= — 綠界 AIO V5 付款（popup auto-submit）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  corsHeaders,
  corsHtmlResponse,
  corsTextResponse,
  jsonResponse,
  wantsJsonResponse,
} from "../_shared/cors.ts";
import {
  createMerchantTradeNo,
  formatMerchantTradeDateTaipei,
  generateEcpayCheckMacValue,
  getAppUrl,
  getEcpayPaymentConfig,
  getSupabaseFunctionsBase,
  isEcpayStage,
  verifyEcpayCheckMacValue,
} from "../_shared/ecpay.ts";
import { buildAutoSubmitFormHtml } from "../_shared/ecpay-popup-html.ts";
import { createPendingLogisticsForOrder } from "../_shared/ecpay-logistics-operations.ts";
import {
  insertPurchaseProductEvents,
  maybeInsertSubOrdersWithLogistics,
} from "../_shared/ecpay-order-helpers.ts";
import { isCheckoutSnapshot } from "../_shared/shop-checkout-core.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const url = new URL(req.url);
  const wantsJson = wantsJsonResponse(req, url);
  const orderId = url.searchParams.get("orderId")?.trim() ?? "";
  const token = url.searchParams.get("token")?.trim() ??
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  if (!orderId) {
    return wantsJson ?
      jsonResponse({ error: "Missing orderId" }, 400)
      : corsTextResponse("Missing orderId", 400);
  }

  const pay = getEcpayPaymentConfig();
  if (!pay.merchantId || !pay.hashKey || !pay.hashIv) {
    return wantsJson ?
      jsonResponse({ error: "Missing ECPAY payment secrets" }, 500)
      : corsTextResponse("Missing ECPAY payment secrets", 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  if (!token) {
    return wantsJson ?
      jsonResponse({ error: "Missing auth" }, 401)
      : corsTextResponse("Missing auth", 401);
  }

  const supabase = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return wantsJson ?
      jsonResponse({ error: "Unauthorized" }, 401)
      : corsTextResponse("Unauthorized", 401);
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      "id, user_id, status, total, merchant_order_no, checkout_snapshot, order_metadata, public_order_no",
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderErr || !order) {
    return wantsJson ?
      jsonResponse({ error: "Order not found" }, 404)
      : corsTextResponse("Order not found", 404);
  }
  if (order.status !== "pending") {
    return wantsJson ?
      jsonResponse({ error: "Order not payable" }, 422)
      : corsTextResponse("Order not payable", 422);
  }

  const snap = order.checkout_snapshot;
  if (!isCheckoutSnapshot(snap) || !snap.logisticsCompleted) {
    return wantsJson ?
      jsonResponse({ error: "請先完成物流設定" }, 422)
      : corsTextResponse("請先完成物流設定", 422);
  }

  const payableAmount = Math.round(
    Number(
      snap.paymentTotal != null && snap.paymentTotal >= 0 ?
        snap.paymentTotal
        : order.total,
    ),
  );

  if (payableAmount <= 0) {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const serverReturn = `${getSupabaseFunctionsBase()}/functions/v1/ecpay-logistics-return`;
    await createPendingLogisticsForOrder(
      admin,
      {
        id: orderId,
        recipient_name: null,
        recipient_phone: null,
        recipient_address_full: null,
        checkout_snapshot: snap,
      },
      serverReturn,
    );
    const { data: refreshed } = await admin
      .from("orders")
      .select("id, checkout_snapshot, user_id")
      .eq("id", orderId)
      .maybeSingle();
    await admin
      .from("orders")
      .update({
        status: "paid",
        order_metadata: {
          ...(typeof order.order_metadata === "object" &&
              order.order_metadata != null ?
            order.order_metadata as Record<string, unknown>
            : {}),
          ecpay: { zeroAmountCheckout: true, paidAt: new Date().toISOString() },
        },
      })
      .eq("id", orderId)
      .eq("status", "pending");
    if (refreshed) {
      await maybeInsertSubOrdersWithLogistics(admin, refreshed);
      if (user.id) {
        await insertPurchaseProductEvents(admin, user.id, orderId);
      }
    }
    if (wantsJson) {
      return jsonResponse({ skipPayment: true, orderId });
    }
    return corsTextResponse("Order completed without payment", 200);
  }

  let merchantTradeNo = order.merchant_order_no ?? "";
  if (!merchantTradeNo) {
    merchantTradeNo = createMerchantTradeNo();
    await supabase
      .from("orders")
      .update({ merchant_order_no: merchantTradeNo })
      .eq("id", orderId);
  }

  const meta = typeof order.order_metadata === "object" &&
      order.order_metadata != null ?
    order.order_metadata as Record<string, unknown>
    : {};
  const itemName = typeof meta.itemDesc === "string" && meta.itemDesc ?
    meta.itemDesc
    : `訂單${order.public_order_no ?? orderId}`.slice(0, 400);

  const fnBase = getSupabaseFunctionsBase();
  const appOriginParam = url.searchParams.get("appOrigin")?.trim() ?? "";
  const appBase = appOriginParam && /^https?:\/\//i.test(appOriginParam) ?
    appOriginParam.replace(/\/$/, "")
    : getAppUrl().replace(/\/$/, "");
  const returnUrl = `${fnBase}/functions/v1/ecpay-return`;
  const orderResultUrl =
    `${fnBase}/functions/v1/ecpay-order-result?appOrigin=${appBase}`;
  const paymentInfoUrl = `${fnBase}/functions/v1/ecpay-payment-info`;

  const fields: Record<string, string> = {
    MerchantID: pay.merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDateTaipei(),
    PaymentType: "aio",
    TotalAmount: String(payableAmount),
    TradeDesc: "NutriPilot商城訂單",
    ItemName: itemName,
    ReturnURL: returnUrl,
    OrderResultURL: orderResultUrl,
    PaymentInfoURL: paymentInfoUrl,
    ChoosePayment: "ALL",
    EncryptType: "1",
    CustomField1: orderId,
  };

  const email = user.email?.trim();
  if (email) fields.Email = email.slice(0, 200);

  fields.CheckMacValue = generateEcpayCheckMacValue(
    fields,
    pay.hashKey,
    pay.hashIv,
  );

  const checkMacSelfOk = verifyEcpayCheckMacValue(
    fields,
    pay.hashKey,
    pay.hashIv,
    false,
  );
  if (!checkMacSelfOk) {
    console.error("[ecpay-checkout] CheckMac self-verify failed", {
      merchantId: pay.merchantId,
      orderResultUrl,
    });
    return wantsJson ?
      jsonResponse({ error: "CheckMac self-verify failed" }, 500)
      : corsTextResponse("CheckMac self-verify failed", 500);
  }

  const stageDebug = isEcpayStage() ?
    {
      merchantId: pay.merchantId,
      orderResultUrl,
      checkMacSelfOk: true,
    }
  : undefined;

  if (wantsJson) {
    return jsonResponse({
      action: pay.aioUrl,
      fields,
      ...(stageDebug ? { debug: stageDebug } : {}),
    });
  }

  const html = buildAutoSubmitFormHtml(pay.aioUrl, fields, "綠界付款");
  return corsHtmlResponse(html);
});
