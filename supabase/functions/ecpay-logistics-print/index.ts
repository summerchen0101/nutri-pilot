/**
 * GET ?subOrderId= — 綠界 C2C 託運單列印（admin JWT super_admin）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { buildAutoSubmitFormHtml } from "../_shared/ecpay-popup-html.ts";
import {
  generateEcpayLogisticsCheckMacValue,
  getEcpayLogisticsConfig,
} from "../_shared/ecpay-logistics.ts";
import { printEndpointForSubtype } from "../_shared/ecpay-logistics-codes.ts";

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const subOrderId = url.searchParams.get("subOrderId")?.trim() ?? "";
  const token = url.searchParams.get("token")?.trim() ??
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  if (!subOrderId || !token) {
    return new Response("Missing subOrderId or token", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user || user.app_metadata?.admin_role !== "super_admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: sub, error: subErr } = await supabase
    .from("sub_orders")
    .select(
      "logistics_subtype, ecpay_logistics_trade_no, cvs_store_id",
    )
    .eq("id", subOrderId)
    .maybeSingle();

  if (subErr || !sub?.ecpay_logistics_trade_no || !sub.logistics_subtype) {
    return new Response("Sub order or logistics data not found", { status: 404 });
  }

  const printUrl = printEndpointForSubtype(
    String(sub.logistics_subtype),
    getEcpayLogisticsConfig().stage,
  );
  if (!printUrl) {
    return new Response("Print not supported for this subtype", { status: 422 });
  }

  const cfg = getEcpayLogisticsConfig();
  const fields: Record<string, string> = {
    MerchantID: cfg.merchantId,
    AllPayLogisticsID: String(sub.ecpay_logistics_trade_no),
    CVSPaymentNo: "",
    CVSValidationNo: "",
  };
  fields.CheckMacValue = generateEcpayLogisticsCheckMacValue(
    fields,
    cfg.hashKey,
    cfg.hashIv,
  );

  const html = buildAutoSubmitFormHtml(printUrl, fields, "列印託運單");
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
