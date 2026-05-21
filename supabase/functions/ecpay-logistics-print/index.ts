/**
 * GET ?subOrderId= — 綠界 V1 託運單列印（admin JWT super_admin / cs）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  corsHtmlResponse,
  jsonResponse,
  wantsJsonResponse,
} from "../_shared/cors.ts";
import {
  isLogisticsPrintSupported,
  printEndpointForSubtype,
} from "../_shared/ecpay-logistics-codes.ts";
import { buildAutoSubmitFormHtml } from "../_shared/ecpay-popup-html.ts";
import { getEcpayLogisticsConfig } from "../_shared/ecpay-logistics.ts";
import { appendCheckMac } from "../_shared/ecpay-logistics-v1.ts";

const SHIP_ROLES = new Set(["super_admin", "cs"]);

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const url = new URL(req.url);
  const wantsJson = wantsJsonResponse(req, url);
  const subOrderId = url.searchParams.get("subOrderId")?.trim() ?? "";
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (!subOrderId || !token) {
    return respondError("Missing subOrderId or auth", 400, wantsJson);
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
  const role = user?.app_metadata?.admin_role;
  if (userErr || !user || typeof role !== "string" || !SHIP_ROLES.has(role)) {
    return respondError("Forbidden", 403, wantsJson);
  }

  const { data: sub, error: subErr } = await supabase
    .from("sub_orders")
    .select(
      "logistics_subtype, ecpay_logistics_trade_no, ecpay_logistics_meta",
    )
    .eq("id", subOrderId)
    .maybeSingle();

  if (subErr || !sub?.ecpay_logistics_trade_no || !sub.logistics_subtype) {
    return respondError("Sub order or logistics data not found", 404, wantsJson);
  }

  const subtype = String(sub.logistics_subtype);
  if (!isLogisticsPrintSupported(subtype)) {
    return respondError("Print not supported for this subtype", 422, wantsJson);
  }

  const logisticsId = String(sub.ecpay_logistics_trade_no).trim();
  if (!logisticsId) {
    return respondError("Logistics ID not found", 404, wantsJson);
  }

  const cfg = getEcpayLogisticsConfig();
  const printUrl = printEndpointForSubtype(subtype, cfg.stage);
  if (!printUrl) {
    return respondError("Print endpoint not configured", 422, wantsJson);
  }

  const fields = buildV1PrintFields(cfg.merchantId, logisticsId, subtype, sub.ecpay_logistics_meta);
  const signed = appendCheckMac(fields, cfg.hashKey, cfg.hashIv);

  if (wantsJson) {
    return jsonResponse({ action: printUrl, fields: signed });
  }

  const bridgeHtml = buildAutoSubmitFormHtml(printUrl, signed, "列印託運單");
  return corsHtmlResponse(bridgeHtml);
});

function buildV1PrintFields(
  merchantId: string,
  logisticsId: string,
  subtype: string,
  meta: unknown,
): Record<string, string> {
  const fields: Record<string, string> = {
    MerchantID: merchantId,
    AllPayLogisticsID: logisticsId,
  };

  const metaObj = meta != null && typeof meta === "object" && !Array.isArray(meta) ?
    meta as Record<string, unknown>
    : {};
  const query = metaObj.queryResponse;
  const create = metaObj.createResponse;
  const q = query != null && typeof query === "object" ?
    query as Record<string, string>
    : {};
  const c = create != null && typeof create === "object" ?
    create as Record<string, string>
    : {};

  const cvsPaymentNo = String(q.CVSPaymentNo ?? c.CVSPaymentNo ?? "").trim();
  const cvsValidationNo = String(q.CVSValidationNo ?? c.CVSValidationNo ?? "")
    .trim();

  if (subtype === "UNIMARTC2C" || subtype === "UNIMARTFREEZE") {
    if (!cvsPaymentNo || !cvsValidationNo) {
      throw new Error("缺少 CVSPaymentNo 或 CVSValidationNo，無法列印 7-ELEVEN 託運單");
    }
    fields.CVSPaymentNo = cvsPaymentNo;
    fields.CVSValidationNo = cvsValidationNo;
  } else if (subtype === "FAMIC2C" || subtype === "OKMARTC2C") {
    if (!cvsPaymentNo) {
      throw new Error("缺少 CVSPaymentNo，無法列印託運單");
    }
    fields.CVSPaymentNo = cvsPaymentNo;
  }

  if (subtype === "TCAT" || subtype === "POST") {
    fields.PrintMode = "1";
  }

  return fields;
}

function respondError(
  message: string,
  status: number,
  wantsJson: boolean,
): Response {
  if (wantsJson) {
    return jsonResponse({ error: message }, status);
  }
  return corsHtmlResponse(
    `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8" /></head><body><p>${message}</p></body></html>`,
    status,
  );
}
