/**
 * 藍新 MPG NotifyURL（背景通知）
 * Secrets: NEWEBPAY_HASH_KEY, NEWEBPAY_HASH_IV, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { mpgDecrypt, randomUuid, verifyMpgTradeSha } from "../_shared/newebpay.ts";

interface SnapshotLine {
  variantId: string;
  qty: number;
  unitPrice: number;
}

interface SnapshotVendor {
  vendorId: string;
  vendorName: string;
  itemsSubtotal: number;
  shippingFee: number;
  effectiveShipping: number;
  freeShippingThreshold: number | null;
  lines: SnapshotLine[];
}

interface CheckoutSnapshot {
  vendors: SnapshotVendor[];
  itemsSubtotal: number;
  shippingTotal: number;
}

function isSnapshot(x: unknown): x is CheckoutSnapshot {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.vendors);
}

function buildSubOrderPublicNo(): string {
  const short = randomUuid().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `SO-${short}`;
}

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

async function maybeInsertSubOrders(
  admin: ReturnType<typeof createClient>,
  order: { id: string; checkout_snapshot: unknown },
): Promise<void> {
  const snap = order.checkout_snapshot;
  if (!isSnapshot(snap) || snap.vendors.length === 0) return;

  const { count: existingCount, error: cntErr } = await admin
    .from("sub_orders")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);

  if (cntErr) {
    console.error("[newebpay-notify] sub_orders count", cntErr);
    return;
  }
  if ((existingCount ?? 0) > 0) return;

  for (const v of snap.vendors) {
    const publicNo = buildSubOrderPublicNo();
    const itemsSub = roundTwd(v.itemsSubtotal);
    const ship = roundTwd(v.effectiveShipping);
    const subTotal = roundTwd(itemsSub + ship);

    const { data: inserted, error: insErr } = await admin
      .from("sub_orders")
      .insert({
        order_id: order.id,
        vendor_id: v.vendorId,
        public_no: publicNo,
        status: "confirmed",
        items_subtotal: itemsSub,
        shipping_fee: ship,
        total: subTotal,
      })
      .select("id, vendor_id")
      .single();

    if (insErr || !inserted) {
      console.error("[newebpay-notify] sub_order insert", insErr);
      continue;
    }

    const subOrderId = inserted.id as string;
    const vendorId = inserted.vendor_id as string;

    const { error: linkErr } = await admin
      .from("order_items")
      .update({ sub_order_id: subOrderId })
      .eq("order_id", order.id)
      .eq("vendor_id", vendorId);

    if (linkErr) {
      console.error("[newebpay-notify] order_items link", linkErr);
    }
  }
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
    .select("id, user_id, status, total, merchant_order_no, checkout_snapshot")
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

  if (order.status === "pending") {
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
  } else if (order.status !== "paid") {
    return new Response("order not payable", { status: 422 });
  }

  const { data: orderAfter, error: afterErr } = await admin
    .from("orders")
    .select("id, status, checkout_snapshot")
    .eq("id", order.id)
    .maybeSingle();

  if (afterErr || !orderAfter || orderAfter.status !== "paid") {
    return okBody();
  }

  await maybeInsertSubOrders(admin, orderAfter);

  return okBody();
});

function roundTwd(v: unknown): number {
  return Math.round(Number(v));
}
