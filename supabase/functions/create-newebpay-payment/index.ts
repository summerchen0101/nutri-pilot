/**
 * 建立藍新 MPG 幕前交易參數（一次付清）
 * Auth: Bearer JWT（anon + Authorization）
 * Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, NEWEBPAY_MERCHANT_ID, NEWEBPAY_HASH_KEY,
 *          NEWEBPAY_HASH_IV, APP_URL, NEWEBPAY_ENV（optional: production | test）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  buildSortedTradeQueryString,
  createMerchantOrderNo,
  mpgEncrypt,
  mpgTradeSha,
  randomUuid,
} from "../_shared/newebpay.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MPG_VERSION = "2.3";
const MAX_ITEM_DESC_LEN = 50;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface LineInput {
  variantId: string;
  qty: number;
}

function mpgGatewayUrl(newebpayEnv: string | undefined): string {
  return newebpayEnv === "production" ?
      "https://core.newebpay.com/MPG/mpg_gateway"
    : "https://ccore.newebpay.com/MPG/mpg_gateway";
}

function roundTwdAmt(n: number): number {
  return Math.round(Number(n));
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
  const appUrl = Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ??
    "http://localhost:3000";
  const newebpayEnv = Deno.env.get("NEWEBPAY_ENV");

  if (!merchantId?.trim() || !hashKey?.trim() || !hashIv?.trim()) {
    return jsonResponse(
      { error: "Missing NEWEBPAY_MERCHANT_ID / NEWEBPAY_HASH_KEY / NEWEBPAY_HASH_IV" },
      500,
    );
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

  let body: { items?: LineInput[] };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const items = body.items;
  if (!items?.length) {
    return jsonResponse({ error: "items required" }, 400);
  }

  const variantIds = items.map((i) => i.variantId);
  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, product_id, label, price, stock")
    .in("id", variantIds);

  if (vErr || !variants?.length) {
    return jsonResponse({ error: vErr?.message ?? "variants not found" }, 400);
  }

  const byId = new Map(variants.map((v) => [v.id as string, v]));
  const productIds = [...new Set(variants.map((v) => v.product_id as string))];
  const { data: products } = await supabase
    .from("products")
    .select("id, is_active, name")
    .in("id", productIds);

  const activePid = new Set(
    (products ?? []).filter((p) => p.is_active === true).map((p) => p.id),
  );
  const productNameById = new Map(
    (products ?? []).map((p) => [p.id as string, String(p.name ?? "")]),
  );

  for (const id of variantIds) {
    const row = byId.get(id);
    if (!row || !activePid.has(row.product_id as string)) {
      return jsonResponse({ error: `invalid variant ${id}` }, 400);
    }
  }

  let total = 0;
  const orderItemRows: {
    variant_id: string;
    qty: number;
    unit_price: number;
  }[] = [];
  const descParts: string[] = [];

  for (const line of items) {
    const v = byId.get(line.variantId)!;
    const qty = Math.max(1, Math.floor(line.qty));
    const stock = v.stock != null ? Number(v.stock) : null;
    if (stock != null && stock < qty) {
      return jsonResponse(
        { error: "庫存不足", variantId: line.variantId },
        409,
      );
    }
    const unit = typeof v.price === "number" ? v.price : Number(v.price);
    total += unit * qty;
    orderItemRows.push({
      variant_id: v.id as string,
      qty,
      unit_price: unit,
    });
    const pname = productNameById.get(v.product_id as string) ?? "商品";
    descParts.push(`${pname}×${qty}`);
  }

  const amt = roundTwdAmt(total);
  if (amt <= 0) {
    return jsonResponse({ error: "金額無效" }, 422);
  }

  let itemDesc = descParts.join("、");
  if (itemDesc.length > MAX_ITEM_DESC_LEN) {
    itemDesc = `${itemDesc.slice(0, MAX_ITEM_DESC_LEN - 1)}…`;
  }

  const orderId = randomUuid();
  const merchantOrderNo = createMerchantOrderNo();
  const baseApp = appUrl.replace(/\/$/, "");
  const returnUrl = `${baseApp}/shop/payment-return`;
  const notifyUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/newebpay-notify`;

  const payerEmail = user.email?.trim() ||
    `${user.id.replace(/-/g, "").slice(0, 20)}@checkout.local`;

  const ts = Math.floor(Date.now() / 1000);
  const tradeData: Record<string, string | number> = {
    MerchantID: merchantId,
    RespondType: "JSON",
    TimeStamp: ts,
    Version: MPG_VERSION,
    MerchantOrderNo: merchantOrderNo,
    Amt: amt,
    ItemDesc: itemDesc,
    Email: payerEmail.slice(0, 50),
    ReturnURL: returnUrl,
    NotifyURL: notifyUrl,
    LoginType: 0,
    CREDIT: 1,
  };

  const tradeQuery = buildSortedTradeQueryString(tradeData);
  let tradeInfo: string;
  let tradeSha: string;
  try {
    tradeInfo = mpgEncrypt(tradeQuery, hashKey, hashIv);
    tradeSha = mpgTradeSha(tradeInfo, hashKey, hashIv);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: `MPG 加密失敗：${msg}` }, 500);
  }

  const { error: orderErr } = await supabase.from("orders").insert({
    id: orderId,
    user_id: user.id,
    status: "pending",
    total: amt,
    merchant_order_no: merchantOrderNo,
    payment_gateway: "newebpay",
  });

  if (orderErr) {
    return jsonResponse({ error: orderErr.message }, 500);
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(
    orderItemRows.map((r) => ({
      order_id: orderId,
      variant_id: r.variant_id,
      qty: r.qty,
      unit_price: r.unit_price,
    })),
  );

  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", orderId);
    return jsonResponse({ error: itemsErr.message }, 500);
  }

  const action = mpgGatewayUrl(newebpayEnv);
  const formFields: Record<string, string> = {
    MerchantID: merchantId,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Version: MPG_VERSION,
  };

  return jsonResponse({
    paymentUrl: action,
    formFields,
    merchantOrderNo,
  });
});
