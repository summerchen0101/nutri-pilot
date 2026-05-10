/**
 * 藍新 MPG NotifyURL（背景通知）
 * Secrets: NEWEBPAY_HASH_KEY, NEWEBPAY_HASH_IV, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { mpgDecrypt, verifyMpgTradeSha } from "../_shared/newebpay.ts";

function parseDecryptedPayload(raw: string): Record<string, string> {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed) as Record<string, unknown>;
      const o: Record<string, string> = {};
      for (const [k, v] of Object.entries(j)) {
        o[k] = v != null ? String(v) : "";
      }
      return o;
    } catch {
      /* fall through */
    }
  }
  const u = new URLSearchParams(trimmed);
  const o: Record<string, string> = {};
  u.forEach((v, k) => {
    o[k] = v;
  });
  return o;
}

function okBody(): Response {
  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}

function badRequest(): Response {
  return new Response("Bad Request", { status: 400 });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const hashKey = Deno.env.get("NEWEBPAY_HASH_KEY");
  const hashIv = Deno.env.get("NEWEBPAY_HASH_IV");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!hashKey?.trim() || !hashIv?.trim() || !url || !serviceKey) {
    return new Response("Missing secrets", { status: 500 });
  }

  const admin = createClient(url, serviceKey);
  const raw = await req.text();
  const params = new URLSearchParams(raw);

  const outerStatus = params.get("Status") ?? "";
  const tradeInfoHex = params.get("TradeInfo") ?? "";
  const tradeSha = params.get("TradeSha") ?? "";

  if (outerStatus !== "SUCCESS" || !tradeInfoHex || !tradeSha) {
    return badRequest();
  }

  if (!verifyMpgTradeSha(tradeInfoHex, tradeSha, hashKey, hashIv)) {
    return badRequest();
  }

  let innerRaw: string;
  try {
    innerRaw = mpgDecrypt(tradeInfoHex, hashKey, hashIv);
  } catch {
    return badRequest();
  }

  const inner = parseDecryptedPayload(innerRaw);
  const tradeStatus = inner["TradeStatus"] ?? "";

  if (tradeStatus !== "1") {
    return okBody();
  }

  const merchantOrderNo = inner["MerchantOrderNo"] ?? "";
  const tradeNo = inner["TradeNo"] ?? "";
  const amtRaw = inner["Amt"] ?? "";

  if (!merchantOrderNo) {
    return badRequest();
  }

  const amt = Number(amtRaw);
  if (!Number.isFinite(amt) || amt <= 0) {
    return badRequest();
  }

  const { data: order, error: findErr } = await admin
    .from("orders")
    .select("id, user_id, status, total, merchant_order_no")
    .eq("merchant_order_no", merchantOrderNo)
    .maybeSingle();

  if (findErr || !order) {
    console.error("[newebpay-notify] order not found", merchantOrderNo, findErr);
    return new Response("order not found", { status: 404 });
  }

  const orderTotal = roundTwd(order.total);
  if (orderTotal !== roundTwd(amt)) {
    console.error(
      "[newebpay-notify] amount mismatch",
      merchantOrderNo,
      orderTotal,
      amt,
    );
    return new Response("amount mismatch", { status: 422 });
  }

  if (order.status === "paid") {
    return okBody();
  }

  const { error: upErr } = await admin
    .from("orders")
    .update({
      status: "paid",
      gateway_trade_no: tradeNo || null,
      gateway_session_ref: tradeNo || null,
    })
    .eq("id", order.id)
    .eq("status", "pending");

  if (upErr) {
    console.error("[newebpay-notify]", upErr);
    return new Response("update error", { status: 500 });
  }

  return okBody();
});

function roundTwd(v: unknown): number {
  return Math.round(Number(v));
}
