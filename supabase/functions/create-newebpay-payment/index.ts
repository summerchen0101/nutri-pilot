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

interface CheckoutBody {
  items?: LineInput[];
  recipientName?: string;
  recipientPhone?: string;
  recipientAddressFull?: string;
  saveShippingToProfile?: boolean;
}

interface VendorRow {
  id: string;
  name: string;
  shipping_fee: number | string | null;
  free_shipping_threshold: number | string | null;
  lead_time_days: number | null;
  is_active: boolean | null;
}

interface VariantRow {
  id: string;
  product_id: string;
  label: string;
  price: number | string;
  stock: number | null;
  product: {
    id: string;
    is_active: boolean | null;
    name: string | null;
    brand: {
      vendor_id: string | null;
      vendor: VendorRow | VendorRow[] | null;
    } | null;
  } | null;
}

interface CheckoutVendorSnapshot {
  vendorId: string;
  vendorName: string;
  itemsSubtotal: number;
  shippingFee: number;
  effectiveShipping: number;
  freeShippingThreshold: number | null;
  lines: { variantId: string; qty: number; unitPrice: number }[];
}

interface CheckoutSnapshot {
  vendors: CheckoutVendorSnapshot[];
  itemsSubtotal: number;
  shippingTotal: number;
}

function mpgGatewayUrl(newebpayEnv: string | undefined): string {
  return newebpayEnv === "production" ?
      "https://core.newebpay.com/MPG/mpg_gateway"
    : "https://ccore.newebpay.com/MPG/mpg_gateway";
}

function roundTwdAmt(n: number): number {
  return Math.round(Number(n));
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeVendor(v: VendorRow | VendorRow[] | null): VendorRow | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function effectiveShippingFee(
  itemsSubtotal: number,
  shippingFee: number,
  freeThreshold: number | null,
): number {
  if (freeThreshold == null) {
    return shippingFee;
  }
  if (itemsSubtotal >= freeThreshold) {
    return 0;
  }
  return shippingFee;
}

function buildPublicOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const short = randomUuid().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `NP-${y}${m}${d}-${short}`;
}

function trimReq(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
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

  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const recipientName = trimReq(body.recipientName);
  const recipientPhone = trimReq(body.recipientPhone);
  const recipientAddressFull = trimReq(body.recipientAddressFull);
  if (!recipientName || !recipientPhone || !recipientAddressFull) {
    return jsonResponse(
      { error: "請填寫完整收件人姓名、電話與地址" },
      422,
    );
  }

  const items = body.items;
  if (!items?.length) {
    return jsonResponse({ error: "items required" }, 400);
  }

  const variantIds = items.map((i) => i.variantId);
  const { data: variantRows, error: vErr } = await supabase
    .from("product_variants")
    .select(
      `
      id,
      product_id,
      label,
      price,
      stock,
      product:products!inner(
        id,
        is_active,
        name,
        brand:brands!inner(
          vendor_id,
          vendor:vendors!inner(
            id,
            name,
            shipping_fee,
            free_shipping_threshold,
            lead_time_days,
            is_active
          )
        )
      )
    `,
    )
    .in("id", variantIds);

  if (vErr) {
    return jsonResponse({ error: vErr.message }, 400);
  }

  const variants = (variantRows ?? []) as unknown as VariantRow[];
  const byId = new Map(variants.map((v) => [v.id as string, v]));

  for (const id of variantIds) {
    const row = byId.get(id);
    if (!row) {
      return jsonResponse({ error: `invalid variant ${id}` }, 400);
    }
    if (row.product?.is_active !== true) {
      return jsonResponse({ error: `invalid variant ${id}` }, 400);
    }
    const vendor = normalizeVendor(row.product?.brand?.vendor ?? null);
    if (!vendor || vendor.is_active !== true) {
      return jsonResponse({ error: `商品未綁定有效出貨廠商：${id}` }, 400);
    }
  }

  type LineComputed = {
    variantId: string;
    qty: number;
    unitPrice: number;
    vendorId: string;
    vendorName: string;
    shippingFee: number;
    freeShippingThreshold: number | null;
  };

  const linesComputed: LineComputed[] = [];

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
    const vendor = normalizeVendor(v.product!.brand!.vendor)!;
    const unit = num(v.price);
    linesComputed.push({
      variantId: v.id,
      qty,
      unitPrice: unit,
      vendorId: vendor.id,
      vendorName: String(vendor.name ?? ""),
      shippingFee: num(vendor.shipping_fee),
      freeShippingThreshold: vendor.free_shipping_threshold == null ?
          null
        : num(vendor.free_shipping_threshold),
    });
  }

  const vendorMap = new Map<string, LineComputed[]>();
  for (const ln of linesComputed) {
    const arr = vendorMap.get(ln.vendorId) ?? [];
    arr.push(ln);
    vendorMap.set(ln.vendorId, arr);
  }

  const snapshotVendors: CheckoutVendorSnapshot[] = [];
  let itemsSubtotalAll = 0;

  for (const [, group] of vendorMap) {
    const vendorId = group[0]!.vendorId;
    const vendorName = group[0]!.vendorName;
    const shippingFee = group[0]!.shippingFee;
    const freeShippingThreshold = group[0]!.freeShippingThreshold;

    let itemsSubtotal = 0;
    const lines: { variantId: string; qty: number; unitPrice: number }[] = [];
    for (const ln of group) {
      itemsSubtotal += ln.unitPrice * ln.qty;
      lines.push({
        variantId: ln.variantId,
        qty: ln.qty,
        unitPrice: ln.unitPrice,
      });
    }
    itemsSubtotalAll += itemsSubtotal;

    const effectiveShipping = effectiveShippingFee(
      itemsSubtotal,
      shippingFee,
      freeShippingThreshold,
    );

    snapshotVendors.push({
      vendorId,
      vendorName,
      itemsSubtotal: roundTwdAmt(itemsSubtotal),
      shippingFee,
      effectiveShipping: roundTwdAmt(effectiveShipping),
      freeShippingThreshold,
      lines,
    });
  }

  const shippingTotal = snapshotVendors.reduce(
    (s, v) => s + v.effectiveShipping,
    0,
  );
  const amt = roundTwdAmt(itemsSubtotalAll + shippingTotal);

  const checkoutSnapshot: CheckoutSnapshot = {
    vendors: snapshotVendors.map((v) => ({
      ...v,
      itemsSubtotal: roundTwdAmt(v.itemsSubtotal),
    })),
    itemsSubtotal: roundTwdAmt(itemsSubtotalAll),
    shippingTotal: roundTwdAmt(shippingTotal),
  };

  if (amt <= 0) {
    return jsonResponse({ error: "金額無效" }, 422);
  }

  const productNameById = new Map(
    variants.map((r) => [r.product_id as string, String(r.product?.name ?? "")]),
  );

  const descParts: string[] = [];
  for (const line of items) {
    const v = byId.get(line.variantId)!;
    const qty = Math.max(1, Math.floor(line.qty));
    const pname = productNameById.get(v.product_id as string) ?? "商品";
    descParts.push(`${pname}×${qty}`);
  }

  let itemDesc = descParts.join("、");
  if (itemDesc.length > MAX_ITEM_DESC_LEN) {
    itemDesc = `${itemDesc.slice(0, MAX_ITEM_DESC_LEN - 1)}…`;
  }

  const orderId = randomUuid();
  const merchantOrderNo = createMerchantOrderNo();
  const publicOrderNo = buildPublicOrderNo();
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
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_address_full: recipientAddressFull,
    public_order_no: publicOrderNo,
    items_subtotal: roundTwdAmt(itemsSubtotalAll),
    shipping_total: roundTwdAmt(shippingTotal),
    checkout_snapshot: checkoutSnapshot,
  });

  if (orderErr) {
    return jsonResponse({ error: orderErr.message }, 500);
  }

  const orderItemRows = linesComputed.map((r) => ({
    order_id: orderId,
    variant_id: r.variantId,
    qty: r.qty,
    unit_price: r.unitPrice,
    vendor_id: r.vendorId,
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(
    orderItemRows,
  );

  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", orderId);
    return jsonResponse({ error: itemsErr.message }, 500);
  }

  if (body.saveShippingToProfile === true) {
    const now = new Date().toISOString();
    const { data: defAddr, error: defErr } = await supabase
      .from("user_shipping_addresses")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();

    if (defErr) {
      console.error("[create-newebpay-payment] default address lookup", defErr);
    }

    const baseAddr = {
      recipient_name: recipientName,
      phone: recipientPhone,
      address_full: recipientAddressFull,
      updated_at: now,
    };

    if (defAddr?.id) {
      const { error: addrErr } = await supabase
        .from("user_shipping_addresses")
        .update(baseAddr)
        .eq("id", defAddr.id)
        .eq("user_id", user.id);
      if (addrErr) {
        console.error("[create-newebpay-payment] address update", addrErr);
      }
    } else {
      const { error: clearErr } = await supabase
        .from("user_shipping_addresses")
        .update({ is_default: false, updated_at: now })
        .eq("user_id", user.id);
      if (clearErr) {
        console.error("[create-newebpay-payment] address clear default", clearErr);
      }
      const { error: insErr } = await supabase
        .from("user_shipping_addresses")
        .insert({
          user_id: user.id,
          ...baseAddr,
          is_default: true,
          sort_order: 0,
        });
      if (insErr) {
        console.error("[create-newebpay-payment] address insert", insErr);
      }
    }

    const { error: profErr } = await supabase
      .from("user_profiles")
      .update({
        shipping_recipient_name: recipientName,
        shipping_phone: recipientPhone,
        shipping_address_full: recipientAddressFull,
        updated_at: now,
      })
      .eq("user_id", user.id);
    if (profErr) {
      console.error("[create-newebpay-payment] profile update", profErr);
    }
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
