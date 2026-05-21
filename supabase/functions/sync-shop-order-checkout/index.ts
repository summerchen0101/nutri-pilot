/**
 * POST — 付款前同步 pending 訂單的點數折抵與 paymentTotal
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { syncPendingOrderShopPoints } from "../_shared/shop-checkout-core.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

  let body: { orderId?: string; applyShopPoints?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const orderId = body.orderId?.trim() ?? "";
  if (!orderId) {
    return jsonResponse({ error: "Missing orderId" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const result = await syncPendingOrderShopPoints(
    supabase,
    admin,
    user.id,
    orderId,
    body.applyShopPoints === true,
  );

  if (!result.ok) {
    return jsonResponse({ error: result.error }, result.status);
  }

  return jsonResponse({
    paymentTotal: result.paymentTotal,
    netOrderTotal: result.netOrderTotal,
    pointsRedeemed: result.pointsRedeemed,
  });
});
