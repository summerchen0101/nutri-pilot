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
  vendorShippingSelections?: Record<string, string>;
  /** vendor_id → 超商門市顯示名（與將來地圖／店舖 API 串接） */
  cvsStoreNameByVendor?: Record<string, string>;
}

interface VendorShippingMethodRow {
  id: string;
  vendor_id: string;
  code: string;
  label: string;
  shipping_fee: number | string | null;
  free_shipping_threshold: number | string | null;
  sort_order: number | string | null;
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
  shippingMethodId?: string | null;
  shippingMethodLabel?: string | null;
  shippingMethodCode?: string | null;
  cvsStoreName?: string | null;
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

function normalizeSelectionMap(
  raw: unknown,
): Record<string, string> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k || typeof k !== "string") continue;
    if (typeof v === "string" && v.trim().length > 0) {
      o[k] = v.trim();
    }
  }
  return o;
}

function normalizeCvsStoreNameByVendor(
  raw: unknown,
  allowedVendorIds: Set<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const vid of allowedVendorIds) {
    out[vid] = "";
  }
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return out;
  }
  const rec = raw as Record<string, unknown>;
  for (const vid of allowedVendorIds) {
    const v = rec[vid];
    out[vid] = typeof v === "string" ? v.trim() : "";
  }
  return out;
}

function sortMethodRows(rows: VendorShippingMethodRow[]): VendorShippingMethodRow[] {
  return [...rows].sort((a, b) =>
    num(a.sort_order) - num(b.sort_order) ||
    String(a.code).localeCompare(String(b.code), "zh-Hant")
  );
}

const STORE_PICKUP_SHIPPING_CODE = "store_pickup";
const HOME_DELIVERY_SHIPPING_CODE = "home_delivery";

function isHomeDeliveryShippingCode(code: string | null | undefined): boolean {
  return code === HOME_DELIVERY_SHIPPING_CODE;
}

/** 與前台 `shipping-method-kind` 一致：非宅配、非門市自取、code 有值視為超商取貨 */
function isCvsShippingCodeEdge(code: string | null | undefined): boolean {
  if (code == null) return false;
  const c = String(code);
  if (c.length === 0) return false;
  if (c === STORE_PICKUP_SHIPPING_CODE) return false;
  return !isHomeDeliveryShippingCode(c);
}

function filterCheckoutMethodRows(
  rows: VendorShippingMethodRow[],
): VendorShippingMethodRow[] {
  return rows.filter((r) => String(r.code) !== STORE_PICKUP_SHIPPING_CODE);
}

/** 與前台 `pickCheapestShippingMethod` 一致：effective 最低，平手依 shipping_fee、sort_order、code */
function pickCheapestMethodRow(
  rowsSorted: VendorShippingMethodRow[],
  itemsSubtotalRounded: number,
): VendorShippingMethodRow {
  let best = rowsSorted[0]!;
  let bestEff = effectiveShippingFee(
    itemsSubtotalRounded,
    num(best.shipping_fee),
    best.free_shipping_threshold == null ? null : num(best.free_shipping_threshold),
  );
  let bestFee = num(best.shipping_fee);

  for (let i = 1; i < rowsSorted.length; i++) {
    const row = rowsSorted[i]!;
    const thr = row.free_shipping_threshold == null ?
      null
      : num(row.free_shipping_threshold);
    const rowFee = num(row.shipping_fee);
    const eff = effectiveShippingFee(
      itemsSubtotalRounded,
      rowFee,
      thr,
    );

    if (eff < bestEff) {
      best = row;
      bestEff = eff;
      bestFee = rowFee;
      continue;
    }
    if (eff > bestEff) continue;

    if (rowFee < bestFee) {
      best = row;
      bestEff = eff;
      bestFee = rowFee;
      continue;
    }
    if (rowFee > bestFee) continue;

    const orderCmp = num(row.sort_order) - num(best.sort_order);
    if (
      orderCmp < 0 ||
      (orderCmp === 0 &&
        String(row.code).localeCompare(String(best.code), "zh-Hant") < 0)
    ) {
      best = row;
      bestEff = eff;
      bestFee = rowFee;
    }
  }

  return best;
}

function resolveVendorShippingPrice(
  vendorRowsSorted: VendorShippingMethodRow[],
  requestedMethodId: string | undefined,
  legacyShippingFee: number,
  legacyFreeThreshold: number | null,
  itemsSubtotalRounded: number,
): {
  shippingFee: number;
  freeShippingThreshold: number | null;
  methodId: string | null;
  methodLabel: string | null;
  methodCode: string | null;
  error?: string;
} {
  if (vendorRowsSorted.length === 0) {
    return {
      shippingFee: legacyShippingFee,
      freeShippingThreshold: legacyFreeThreshold,
      methodId: null,
      methodLabel: null,
      methodCode: null,
    };
  }

  const sortedAll = sortMethodRows(vendorRowsSorted);
  const checkoutRows = filterCheckoutMethodRows(sortedAll);
  const sorted =
    checkoutRows.length > 0 ? checkoutRows : sortedAll;

  const req =
    typeof requestedMethodId === "string" && requestedMethodId.length > 0 ?
      requestedMethodId
    : undefined;

  let picked: VendorShippingMethodRow;

  if (req) {
    const found = sortedAll.find((r) => String(r.id) === req);
    if (!found) {
      return {
        shippingFee: legacyShippingFee,
        freeShippingThreshold: legacyFreeThreshold,
        methodId: null,
        methodLabel: null,
        methodCode: null,
        error: "無效的運送方式",
      };
    }
    picked = found;
  } else {
    picked = pickCheapestMethodRow(sorted, itemsSubtotalRounded);
  }

  const fee = num(picked.shipping_fee, legacyShippingFee);
  const thr = picked.free_shipping_threshold == null ?
    null
    : num(picked.free_shipping_threshold);

  return {
    shippingFee: fee,
    freeShippingThreshold: thr,
    methodId: String(picked.id),
    methodLabel: String(picked.label ?? ""),
    methodCode: String(picked.code ?? ""),
  };
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
  if (!recipientName || !recipientPhone) {
    return jsonResponse(
      { error: "請填寫收件人姓名與聯絡電話" },
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

  const selectionMap = normalizeSelectionMap(body.vendorShippingSelections);

  const vendorIds = [...vendorMap.keys()];
  const { data: shippingMethodRows, error: smErr } = await supabase
    .from("vendor_shipping_methods")
    .select(
      "id, vendor_id, code, label, shipping_fee, free_shipping_threshold, sort_order",
    )
    .in("vendor_id", vendorIds)
    .eq("is_active", true);

  if (smErr) {
    return jsonResponse({ error: smErr.message }, 400);
  }

  const methodRows = (shippingMethodRows ?? []) as VendorShippingMethodRow[];

  const snapshotVendors: CheckoutVendorSnapshot[] = [];
  let itemsSubtotalAll = 0;

  for (const [, group] of vendorMap) {
    const vendorId = group[0]!.vendorId;
    const vendorName = group[0]!.vendorName;
    const legacyShippingFee = group[0]!.shippingFee;
    const legacyThr = group[0]!.freeShippingThreshold;

    let itemsSubtotal = 0;
    const snapLines: { variantId: string; qty: number; unitPrice: number }[] = [];
    for (const ln of group) {
      itemsSubtotal += ln.unitPrice * ln.qty;
      snapLines.push({
        variantId: ln.variantId,
        qty: ln.qty,
        unitPrice: ln.unitPrice,
      });
    }
    itemsSubtotalAll += itemsSubtotal;

    const vr = sortMethodRows(
      methodRows.filter((r) => String(r.vendor_id) === vendorId),
    );
    const roundedSub = roundTwdAmt(itemsSubtotal);
    const resolved = resolveVendorShippingPrice(
      vr,
      selectionMap[vendorId],
      legacyShippingFee,
      legacyThr,
      roundedSub,
    );
    if (resolved.error) {
      return jsonResponse({ error: resolved.error }, 422);
    }

    const effectiveShipping = effectiveShippingFee(
      roundedSub,
      resolved.shippingFee,
      resolved.freeShippingThreshold,
    );

    snapshotVendors.push({
      vendorId,
      vendorName,
      itemsSubtotal: roundedSub,
      shippingFee: resolved.shippingFee,
      effectiveShipping: roundTwdAmt(effectiveShipping),
      freeShippingThreshold: resolved.freeShippingThreshold,
      lines: snapLines,
      shippingMethodId: resolved.methodId,
      shippingMethodLabel: resolved.methodLabel,
      shippingMethodCode: resolved.methodCode,
    });
  }

  const shippingTotal = snapshotVendors.reduce(
    (s, v) => s + v.effectiveShipping,
    0,
  );

  const vendorIdSet = new Set(snapshotVendors.map((v) => v.vendorId));
  const cvsStoreByVendor = normalizeCvsStoreNameByVendor(
    body.cvsStoreNameByVendor,
    vendorIdSet,
  );

  let anyNeedsAddress = false;
  for (const v of snapshotVendors) {
    const code = v.shippingMethodCode;
    if (isCvsShippingCodeEdge(code)) {
      const store = cvsStoreByVendor[v.vendorId] ?? "";
      if (!store) {
        return jsonResponse(
          {
            error: `請填寫或選擇超商門市（${v.vendorName}）`,
          },
          422,
        );
      }
    } else {
      anyNeedsAddress = true;
    }
  }

  if (anyNeedsAddress && !recipientAddressFull) {
    return jsonResponse(
      { error: "請填寫收件地址（訂單含宅配運送）" },
      422,
    );
  }

  const amt = roundTwdAmt(itemsSubtotalAll + shippingTotal);

  const checkoutSnapshot: CheckoutSnapshot = {
    vendors: snapshotVendors.map((v) => ({
      ...v,
      itemsSubtotal: roundTwdAmt(v.itemsSubtotal),
      cvsStoreName: isCvsShippingCodeEdge(v.shippingMethodCode) ?
          (cvsStoreByVendor[v.vendorId] ?? null)
        : null,
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
    recipient_address_full: recipientAddressFull.length > 0 ? recipientAddressFull : null,
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

  if (body.saveShippingToProfile === true && recipientAddressFull.length > 0) {
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
