/**
 * POST — 宅配：標記地址與 TCAT/POST subtype（結帳頁確認後）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { markHomeVendorLogisticsReady } from "../_shared/ecpay-logistics-operations.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: {
    orderId?: string;
    vendorId?: string;
    homeLogisticsSubType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const orderId = body.orderId?.trim() ?? "";
  const vendorId = body.vendorId?.trim() ?? "";
  const homeSub = body.homeLogisticsSubType?.trim() ?? "";

  if (!orderId || !vendorId) {
    return jsonResponse({ error: "Missing orderId or vendorId" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: order, error: orderErr } = await userClient
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderErr || !order) {
    return jsonResponse({ error: "Order not found" }, 404);
  }
  if (order.status !== "pending") {
    return jsonResponse({ error: "Order not pending" }, 422);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    await markHomeVendorLogisticsReady(
      admin,
      orderId,
      vendorId,
      homeSub === "TCAT" || homeSub === "POST" ? homeSub : undefined,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 422);
  }

  return jsonResponse({ ok: true });
});
