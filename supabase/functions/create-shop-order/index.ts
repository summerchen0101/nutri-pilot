/**
 * 建立 pending 訂單（綠界：物流 → 付款）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  buildShopCheckout,
  saveShippingToProfile,
} from "../_shared/shop-checkout-core.ts";
import type { CheckoutBody } from "../_shared/shop-checkout-types.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
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

  const built = await buildShopCheckout(supabase, user.id, body);
  if (!built.ok) {
    return jsonResponse({ error: built.error }, built.status);
  }

  const { error: orderErr } = await supabase.from("orders").insert({
    id: built.orderId,
    user_id: user.id,
    status: "pending",
    total: built.total,
    merchant_order_no: null,
    payment_gateway: "ecpay",
    recipient_name: built.recipientName,
    recipient_phone: built.recipientPhone,
    recipient_address_full: built.recipientAddressFull.length > 0 ?
      built.recipientAddressFull
      : null,
    public_order_no: built.publicOrderNo,
    items_subtotal: built.checkoutSnapshot.itemsSubtotal,
    shipping_total: built.checkoutSnapshot.shippingTotal,
    checkout_snapshot: built.checkoutSnapshot,
    order_metadata: { itemDesc: built.itemDesc },
  });

  if (orderErr) {
    return jsonResponse({ error: orderErr.message }, 500);
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(
    built.orderItemRows,
  );

  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", built.orderId);
    return jsonResponse({ error: itemsErr.message }, 500);
  }

  const pointsRedeemed = Math.max(
    0,
    Math.floor(Number(built.checkoutSnapshot.pointsRedeemed ?? 0)),
  );

  if (pointsRedeemed > 0) {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: redeemRaw, error: redeemErr } = await admin.rpc(
      "redeem_shop_points_for_order",
      {
        p_user_id: user.id,
        p_order_id: built.orderId,
        p_amount: pointsRedeemed,
      },
    );

    if (redeemErr) {
      await supabase.from("order_items").delete().eq("order_id", built.orderId);
      await supabase.from("orders").delete().eq("id", built.orderId);
      return jsonResponse({ error: redeemErr.message }, 500);
    }

    const redeem = redeemRaw as { ok?: boolean; error?: string } | null;
    if (!redeem?.ok) {
      await supabase.from("order_items").delete().eq("order_id", built.orderId);
      await supabase.from("orders").delete().eq("id", built.orderId);
      const msg =
        redeem?.error === "insufficient_balance" ? "購物點餘額不足"
        : redeem?.error === "insufficient_lot_inventory" ? "購物點批次不足"
        : redeem?.error === "already_redeemed" ? "點數已折抵"
        : "點數折抵失敗";
      return jsonResponse({ error: msg }, 409);
    }
  }

  if (built.saveShippingToProfile) {
    await saveShippingToProfile(
      supabase,
      user.id,
      built.recipientName,
      built.recipientPhone,
      built.recipientAddressFull,
    );
  }

  const vendor = built.checkoutSnapshot.vendors[0];

  return jsonResponse({
    orderId: built.orderId,
    publicOrderNo: built.publicOrderNo,
    vendorId: vendor?.vendorId ?? body.checkoutVendorId ?? null,
    shippingMethodCode: vendor?.shippingMethodCode ?? null,
    total: built.total,
    paymentTotal: built.checkoutSnapshot.paymentTotal ?? built.total,
  });
});
