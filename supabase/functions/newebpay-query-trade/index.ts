/**
 * 藍新單筆交易查詢（手冊 4.3 NPA-B02）
 * Auth: Bearer JWT + app_metadata.admin_role = super_admin
 * Secrets: NEWEBPAY_MERCHANT_ID, NEWEBPAY_HASH_KEY, NEWEBPAY_HASH_IV, NEWEBPAY_ENV
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  mpgQueryCheckValue,
  queryTradeInfoUrl,
} from "../_shared/newebpay.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const QUERY_VERSION = "1.3";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function roundTwd(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? Math.round(v) : 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const merchantId = Deno.env.get("NEWEBPAY_MERCHANT_ID");
  const hashKey = Deno.env.get("NEWEBPAY_HASH_KEY");
  const hashIv = Deno.env.get("NEWEBPAY_HASH_IV");
  const newebpayEnv = Deno.env.get("NEWEBPAY_ENV");

  if (!merchantId?.trim() || !hashKey?.trim() || !hashIv?.trim()) {
    return jsonResponse({ error: "Missing NEWEBPAY secrets" }, 500);
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

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return jsonResponse({ error: "orderId required" }, 422);
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, merchant_order_no, total, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr) {
    return jsonResponse({ error: orderErr.message }, 500);
  }
  if (!order?.merchant_order_no) {
    return jsonResponse({ error: "訂單缺少 merchant_order_no" }, 422);
  }

  const merchantOrderNo = order.merchant_order_no;
  const amt = roundTwd(order.total);
  if (amt <= 0) {
    return jsonResponse({ error: "訂單金額無效" }, 422);
  }

  const ts = Math.floor(Date.now() / 1000);
  const checkValue = mpgQueryCheckValue(
    merchantId,
    merchantOrderNo,
    amt,
    hashKey,
    hashIv,
  );

  const form = new URLSearchParams();
  form.set("MerchantID", merchantId);
  form.set("Version", QUERY_VERSION);
  form.set("RespondType", "JSON");
  form.set("CheckValue", checkValue);
  form.set("TimeStamp", String(ts));
  form.set("MerchantOrderNo", merchantOrderNo);
  form.set("Amt", String(amt));

  const action = queryTradeInfoUrl(newebpayEnv);
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(action, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: `無法連線藍新查詢：${msg}` }, 502);
  }

  const rawText = await upstreamRes.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return jsonResponse(
      {
        error: "藍新回傳非 JSON",
        raw: rawText.slice(0, 500),
      },
      502,
    );
  }

  return jsonResponse({
    ok: true,
    localStatus: order.status,
    merchantOrderNo,
    newebpay: parsed,
  });
});
