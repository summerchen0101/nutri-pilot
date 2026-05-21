/**
 * POST — 綠界 ReturnURL（付款入帳權威）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  getEcpayPaymentConfig,
  parseEcpayFormBody,
  verifyEcpayCheckMacValue,
} from "../_shared/ecpay.ts";
import {
  insertPurchaseProductEvents,
  maybeInsertSubOrdersWithLogistics,
} from "../_shared/ecpay-order-helpers.ts";

function roundTwd(v: unknown): number {
  return Math.round(Number(v));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("0|Method", { status: 405 });
  }

  const pay = getEcpayPaymentConfig();
  const raw = await req.text();
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.includes("\"Data\"")) {
    console.warn(
      "[ecpay-return] envelope-style callback detected; AIO V5 flat CheckMac expected",
    );
  }
  const params = parseEcpayFormBody(raw);

  if (!verifyEcpayCheckMacValue(params, pay.hashKey, pay.hashIv, true)) {
    return new Response("0|CheckMac Error", { status: 400 });
  }

  const rtnCode = params.RtnCode ?? "";
  const merchantTradeNo = params.MerchantTradeNo ?? "";
  const tradeNo = params.TradeNo ?? "";
  const amtRaw = params.TradeAmt ?? params.TotalAmount ?? "";

  if (rtnCode !== "1") {
    return new Response("1|OK", { headers: { "Content-Type": "text/plain" } });
  }

  if (!merchantTradeNo) {
    return new Response("0|No MerchantTradeNo", { status: 400 });
  }

  const amt = Number(amtRaw);
  if (!Number.isFinite(amt) || amt <= 0) {
    return new Response("0|Invalid amount", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: order, error: findErr } = await admin
    .from("orders")
    .select("id, user_id, status, total, merchant_order_no, checkout_snapshot, order_metadata")
    .eq("merchant_order_no", merchantTradeNo)
    .maybeSingle();

  if (findErr || !order) {
    console.error("[ecpay-return] order not found", merchantTradeNo, findErr);
    return new Response("0|Order not found", { status: 404 });
  }

  if (roundTwd(order.total) !== roundTwd(amt)) {
    console.error("[ecpay-return] amount mismatch", order.total, amt);
    return new Response("0|Amount mismatch", { status: 422 });
  }

  const prevMeta = typeof order.order_metadata === "object" &&
      order.order_metadata != null ?
    order.order_metadata as Record<string, unknown>
    : {};

  let transitionedToPaid = false;

  if (order.status === "pending") {
    const { data: updatedRow, error: upErr } = await admin
      .from("orders")
      .update({
        status: "paid",
        gateway_trade_no: tradeNo || null,
        gateway_session_ref: tradeNo || null,
        order_metadata: {
          ...prevMeta,
          ecpay: {
            ...(typeof prevMeta.ecpay === "object" && prevMeta.ecpay != null ?
              prevMeta.ecpay as Record<string, unknown>
              : {}),
            returnCallback: params,
            paidAt: new Date().toISOString(),
          },
        },
      })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (upErr) {
      console.error("[ecpay-return]", upErr);
      return new Response("0|Update error", { status: 500 });
    }
    transitionedToPaid = updatedRow != null;
  } else if (order.status !== "paid") {
    return new Response("0|Not payable", { status: 422 });
  }

  const { data: orderAfter } = await admin
    .from("orders")
    .select("id, status, checkout_snapshot, user_id")
    .eq("id", order.id)
    .maybeSingle();

  if (!orderAfter || orderAfter.status !== "paid") {
    return new Response("1|OK", { headers: { "Content-Type": "text/plain" } });
  }

  await maybeInsertSubOrdersWithLogistics(admin, orderAfter);

  if (transitionedToPaid && order.user_id) {
    await insertPurchaseProductEvents(
      admin,
      String(order.user_id),
      String(order.id),
    );
  }

  return new Response("1|OK", { headers: { "Content-Type": "text/plain" } });
});
