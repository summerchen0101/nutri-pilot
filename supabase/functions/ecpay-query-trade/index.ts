/**
 * POST — 綠界查詢交易（super_admin）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  generateEcpayCheckMacValue,
  getEcpayPaymentConfig,
} from "../_shared/ecpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const pay = getEcpayPaymentConfig();
  if (!pay.merchantId || !pay.hashKey || !pay.hashIv) {
    return jsonResponse({ error: "Missing ECPAY secrets" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization" }, 401);
  }

  const supabase = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (user.app_metadata?.admin_role !== "super_admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return jsonResponse({ error: "orderId required" }, 400);
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("merchant_order_no, total, payment_gateway")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order?.merchant_order_no) {
    return jsonResponse({ error: "Order or merchant trade no not found" }, 404);
  }

  const fields: Record<string, string> = {
    MerchantID: pay.merchantId,
    MerchantTradeNo: order.merchant_order_no,
    TimeStamp: String(Math.floor(Date.now() / 1000)),
  };
  fields.CheckMacValue = generateEcpayCheckMacValue(
    fields,
    pay.hashKey,
    pay.hashIv,
  );

  const form = new URLSearchParams(fields);
  const res = await fetch(pay.queryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    const p = new URLSearchParams(text);
    const o: Record<string, string> = {};
    p.forEach((v, k) => {
      o[k] = v;
    });
    parsed = o;
  }

  return jsonResponse({
    gateway: order.payment_gateway,
    merchantOrderNo: order.merchant_order_no,
    queryStatus: res.status,
    result: parsed,
  });
});
