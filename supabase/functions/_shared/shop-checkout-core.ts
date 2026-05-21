import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { randomUuid, validateEcpayRecipientName } from "./ecpay.ts";
import { resolveLogisticsFromVendorCode } from "./ecpay-logistics-codes.ts";
import type {
  CheckoutBody,
  CheckoutSnapshot,
  CheckoutVendorSnapshot,
  LogisticsQueueItem,
  VariantRow,
  VendorShippingMethodRow,
  VendorRow,
} from "./shop-checkout-types.ts";

export type { CheckoutBody, CheckoutSnapshot, LogisticsQueueItem };

const STORE_PICKUP_SHIPPING_CODE = "store_pickup";
const HOME_DELIVERY_SHIPPING_CODE = "home_delivery";

export function roundTwdAmt(n: number): number {
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
  if (freeThreshold == null) return shippingFee;
  if (itemsSubtotal >= freeThreshold) return 0;
  return shippingFee;
}

function normalizeSelectionMap(raw: unknown): Record<string, string> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k || typeof k !== "string") continue;
    if (typeof v === "string" && v.trim().length > 0) o[k] = v.trim();
  }
  return o;
}

function sortMethodRows(rows: VendorShippingMethodRow[]): VendorShippingMethodRow[] {
  return [...rows].sort((a, b) =>
    num(a.sort_order) - num(b.sort_order) ||
    String(a.code).localeCompare(String(b.code), "zh-Hant")
  );
}

function isHomeDeliveryShippingCode(code: string | null | undefined): boolean {
  return code === HOME_DELIVERY_SHIPPING_CODE;
}

export function isCvsShippingCodeEdge(code: string | null | undefined): boolean {
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
    const eff = effectiveShippingFee(itemsSubtotalRounded, rowFee, thr);

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
  const sorted = checkoutRows.length > 0 ? checkoutRows : sortedAll;
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

export function buildPublicOrderNo(): string {
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

export type BuildCheckoutResult =
  | {
    ok: true;
    orderId: string;
    publicOrderNo: string;
    total: number;
    checkoutSnapshot: CheckoutSnapshot;
    logisticsQueue: LogisticsQueueItem[];
    orderItemRows: {
      order_id: string;
      variant_id: string;
      qty: number;
      unit_price: number;
      vendor_id: string;
    }[];
    recipientName: string;
    recipientPhone: string;
    recipientAddressFull: string;
    saveShippingToProfile: boolean;
    itemDesc: string;
  }
  | { ok: false; error: string; status: number };

export async function buildShopCheckout(
  supabase: SupabaseClient,
  userId: string,
  body: CheckoutBody,
): Promise<BuildCheckoutResult> {
  const recipientName = trimReq(body.recipientName);
  const recipientPhone = trimReq(body.recipientPhone);
  const recipientAddressFull = trimReq(body.recipientAddressFull);

  if (!recipientName || !recipientPhone) {
    return { ok: false, error: "請填寫收件人姓名與聯絡電話", status: 422 };
  }

  const nameErr = validateEcpayRecipientName(recipientName);
  if (nameErr) {
    return { ok: false, error: nameErr, status: 422 };
  }

  const items = body.items;
  if (!items?.length) {
    return { ok: false, error: "items required", status: 400 };
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
    return { ok: false, error: vErr.message, status: 400 };
  }

  const variants = (variantRows ?? []) as unknown as VariantRow[];
  const byId = new Map(variants.map((v) => [v.id as string, v]));

  for (const id of variantIds) {
    const row = byId.get(id);
    if (!row) return { ok: false, error: `invalid variant ${id}`, status: 400 };
    if (row.product?.is_active !== true) {
      return { ok: false, error: `invalid variant ${id}`, status: 400 };
    }
    const vendor = normalizeVendor(row.product?.brand?.vendor ?? null);
    if (!vendor || vendor.is_active !== true) {
      return { ok: false, error: `商品未綁定有效出貨廠商：${id}`, status: 400 };
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
      return {
        ok: false,
        error: "庫存不足",
        status: 409,
      };
    }
    const vendor = normalizeVendor(v.product!.brand!.vendor)!;
    linesComputed.push({
      variantId: v.id,
      qty,
      unitPrice: num(v.price),
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
    return { ok: false, error: smErr.message, status: 400 };
  }

  const methodRows = (shippingMethodRows ?? []) as VendorShippingMethodRow[];
  const snapshotVendors: CheckoutVendorSnapshot[] = [];
  let itemsSubtotalAll = 0;
  const logisticsQueue: LogisticsQueueItem[] = [];

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
      return { ok: false, error: resolved.error, status: 422 };
    }

    const effectiveShipping = effectiveShippingFee(
      roundedSub,
      resolved.shippingFee,
      resolved.freeShippingThreshold,
    );

    const mapping = resolveLogisticsFromVendorCode(resolved.methodCode);
    if (!mapping) {
      return {
        ok: false,
        error: `無法對應綠界物流：${resolved.methodCode ?? ""}`,
        status: 422,
      };
    }

    logisticsQueue.push({
      vendorId,
      vendorName,
      logisticsType: mapping.logisticsType,
      logisticsSubType: mapping.logisticsSubType,
    });

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

  let anyNeedsAddress = false;
  for (const v of snapshotVendors) {
    if (!isCvsShippingCodeEdge(v.shippingMethodCode)) {
      anyNeedsAddress = true;
    }
  }

  if (anyNeedsAddress && !recipientAddressFull) {
    return {
      ok: false,
      error: "請填寫收件地址（訂單含宅配運送）",
      status: 422,
    };
  }

  const shippingTotal = snapshotVendors.reduce(
    (s, v) => s + v.effectiveShipping,
    0,
  );
  const amt = roundTwdAmt(itemsSubtotalAll + shippingTotal);

  if (amt <= 0) {
    return { ok: false, error: "金額無效", status: 422 };
  }

  const logisticsByVendor: CheckoutSnapshot["logisticsByVendor"] = {};
  for (const v of snapshotVendors) {
    const mapping = resolveLogisticsFromVendorCode(v.shippingMethodCode)!;
    logisticsByVendor[v.vendorId] = {
      logisticsType: mapping.logisticsType,
      logisticsSubType: mapping.logisticsSubType,
      completed: false,
    };
  }

  const checkoutSnapshot: CheckoutSnapshot = {
    vendors: snapshotVendors,
    itemsSubtotal: roundTwdAmt(itemsSubtotalAll),
    shippingTotal: roundTwdAmt(shippingTotal),
    logisticsByVendor,
    logisticsCompleted: false,
  };

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

  let itemDesc = descParts.join("#");
  if (itemDesc.length > 400) {
    itemDesc = `${itemDesc.slice(0, 399)}…`;
  }

  const orderId = randomUuid();
  const orderItemRows = linesComputed.map((r) => ({
    order_id: orderId,
    variant_id: r.variantId,
    qty: r.qty,
    unit_price: r.unitPrice,
    vendor_id: r.vendorId,
  }));

  return {
    ok: true,
    orderId,
    publicOrderNo: buildPublicOrderNo(),
    total: amt,
    checkoutSnapshot,
    logisticsQueue,
    orderItemRows,
    recipientName,
    recipientPhone,
    recipientAddressFull,
    saveShippingToProfile: body.saveShippingToProfile === true,
    itemDesc,
  };
}

export async function saveShippingToProfile(
  supabase: SupabaseClient,
  userId: string,
  recipientName: string,
  recipientPhone: string,
  recipientAddressFull: string,
): Promise<void> {
  if (recipientAddressFull.length === 0) return;
  const now = new Date().toISOString();
  const { data: defAddr, error: defErr } = await supabase
    .from("user_shipping_addresses")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (defErr) {
    console.error("[shop-checkout] default address lookup", defErr);
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
      .eq("user_id", userId);
    if (addrErr) console.error("[shop-checkout] address update", addrErr);
  } else {
    const { error: clearErr } = await supabase
      .from("user_shipping_addresses")
      .update({ is_default: false, updated_at: now })
      .eq("user_id", userId);
    if (clearErr) console.error("[shop-checkout] address clear default", clearErr);
    const { error: insErr } = await supabase
      .from("user_shipping_addresses")
      .insert({
        user_id: userId,
        ...baseAddr,
        is_default: true,
        sort_order: 0,
      });
    if (insErr) console.error("[shop-checkout] address insert", insErr);
  }

  const { error: profErr } = await supabase
    .from("user_profiles")
    .update({
      shipping_recipient_name: recipientName,
      shipping_phone: recipientPhone,
      shipping_address_full: recipientAddressFull,
      updated_at: now,
    })
    .eq("user_id", userId);
  if (profErr) console.error("[shop-checkout] profile update", profErr);
}

export function isCheckoutSnapshot(x: unknown): x is CheckoutSnapshot {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.vendors);
}

export function recomputeLogisticsCompleted(
  snap: CheckoutSnapshot,
): boolean {
  for (const v of snap.vendors) {
    const draft = snap.logisticsByVendor[v.vendorId];
    if (!draft?.completed) return false;
  }
  return snap.vendors.length > 0;
}
