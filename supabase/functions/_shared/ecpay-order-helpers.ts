import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { randomUuid } from "./ecpay.ts";
import { isCvsShippingCodeEdge } from "./shop-checkout-core.ts";
import type { CheckoutSnapshot, LogisticsDraft } from "./shop-checkout-types.ts";

function roundTwd(v: unknown): number {
  return Math.round(Number(v));
}

function buildSubOrderPublicNo(): string {
  const short = randomUuid().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `SO-${short}`;
}

function shippingCarrierFromDraft(draft: LogisticsDraft | null): string | null {
  if (!draft) return null;
  if (draft.logisticsType === "CVS") return "ecpay_cvs";
  if (draft.logisticsSubType === "POST") return "post";
  if (draft.logisticsSubType === "TCAT") return "tcat";
  return "ecpay_home";
}

export async function maybeInsertSubOrdersWithLogistics(
  admin: SupabaseClient,
  order: { id: string; checkout_snapshot: unknown },
): Promise<void> {
  const snap = order.checkout_snapshot;
  if (snap == null || typeof snap !== "object") return;
  const s = snap as CheckoutSnapshot;
  if (!Array.isArray(s.vendors) || s.vendors.length === 0) return;

  const { count: existingCount, error: cntErr } = await admin
    .from("sub_orders")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);

  if (cntErr) {
    console.error("[ecpay-order] sub_orders count", cntErr);
    return;
  }
  if ((existingCount ?? 0) > 0) return;

  for (const v of s.vendors) {
    const draft = s.logisticsByVendor?.[v.vendorId] ?? null;
    const publicNo = buildSubOrderPublicNo();
    const itemsSub = roundTwd(v.itemsSubtotal);
    const ship = roundTwd(v.effectiveShipping);
    const subTotal = roundTwd(itemsSub + ship);

    const isCvs = isCvsShippingCodeEdge(v.shippingMethodCode);
    const row: Record<string, unknown> = {
      order_id: order.id,
      vendor_id: v.vendorId,
      public_no: publicNo,
      status: "confirmed",
      items_subtotal: itemsSub,
      shipping_fee: ship,
      total: subTotal,
      logistics_type: draft?.logisticsType ?? null,
      logistics_subtype: draft?.logisticsSubType ?? null,
      shipping_carrier: shippingCarrierFromDraft(draft),
      cvs_store_id: isCvs ? (draft?.cvsStoreId ?? null) : null,
      cvs_store_name: isCvs ? (draft?.cvsStoreName ?? null) : null,
      cvs_store_address: isCvs ? (draft?.cvsStoreAddress ?? null) : null,
      shipping_address: !isCvs ?
        (draft?.shippingAddress ?? null)
        : (draft?.cvsStoreAddress ?? null),
      ecpay_logistics_trade_no: draft?.ecpayLogisticsTradeNo ?? null,
      ecpay_logistics_meta: draft?.meta ?? null,
    };

    const { data: inserted, error: insErr } = await admin
      .from("sub_orders")
      .insert(row)
      .select("id, vendor_id")
      .single();

    if (insErr || !inserted) {
      console.error("[ecpay-order] sub_order insert", insErr);
      continue;
    }

    const { error: linkErr } = await admin
      .from("order_items")
      .update({ sub_order_id: inserted.id })
      .eq("order_id", order.id)
      .eq("vendor_id", inserted.vendor_id);

    if (linkErr) {
      console.error("[ecpay-order] order_items link", linkErr);
    }
  }
}

export async function insertPurchaseProductEvents(
  admin: SupabaseClient,
  userId: string,
  orderId: string,
): Promise<void> {
  type OrderItemVariantRow = {
    qty?: number | null;
    variant: { product_id: string } | null;
  };

  const { data: rows, error } = await admin
    .from("order_items")
    .select(`qty, variant:product_variants ( product_id )`)
    .eq("order_id", orderId);

  if (error) {
    console.error("[ecpay-order] product_events fetch", error);
    return;
  }
  if (!rows?.length) return;

  const events = [];
  for (const rUnknown of rows as OrderItemVariantRow[]) {
    const pid = rUnknown.variant?.product_id;
    if (!pid) continue;
    events.push({
      user_id: userId,
      product_id: pid,
      event_type: "purchase",
      source: "ecpay_return",
    });
  }

  if (events.length === 0) return;
  const { error: evErr } = await admin.from("product_events").insert(events);
  if (evErr) console.error("[ecpay-order] product_events insert", evErr);
}
