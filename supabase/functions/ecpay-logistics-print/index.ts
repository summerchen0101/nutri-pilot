/**
 * GET ?subOrderId= — 綠界 V2 託運單列印（admin JWT super_admin / cs）
 * ?format=json — 回傳 form bridge（避開 Supabase 託管 HTML sandbox）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  corsHtmlResponse,
  jsonResponse,
  wantsJsonResponse,
} from "../_shared/cors.ts";
import { isLogisticsPrintSupported } from "../_shared/ecpay-logistics-codes.ts";
import {
  buildAutoSubmitFormHtml,
  extractHtmlPostForm,
} from "../_shared/ecpay-popup-html.ts";
import {
  formatLogisticsV2Error,
  getEcpayLogisticsConfig,
  requestLogisticsPrintPage,
} from "../_shared/ecpay-logistics.ts";

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

  let logisticsId = String(sub.ecpay_logistics_trade_no);
  if (!logisticsId) {
    const meta = sub.ecpay_logistics_meta;
    if (meta != null && typeof meta === "object" && !Array.isArray(meta)) {
      const createByTemp = (meta as Record<string, unknown>).createByTemp;
      if (createByTemp != null && typeof createByTemp === "object") {
        const decrypted = (createByTemp as Record<string, unknown>)._decrypted;
        if (decrypted != null && typeof decrypted === "object") {
          const id = (decrypted as Record<string, unknown>).LogisticsID;
          if (typeof id === "string" && id.trim()) {
            logisticsId = id.trim();
          }
        }
      }
    }
  }

  if (!logisticsId) {
    return respondError("Logistics ID not found", 404, wantsJson);
  }

  const cfg = getEcpayLogisticsConfig();

  try {
    const result = await requestLogisticsPrintPage(
      cfg.host,
      cfg.merchantId,
      logisticsId,
      subtype,
      cfg.hashKey,
      cfg.hashIv,
    );

    if (!result.html) {
      const errMsg = formatLogisticsV2Error(result);
      return respondError(errMsg, 502, wantsJson);
    }

    const extracted = extractHtmlPostForm(result.html);
    if (!extracted) {
      return respondError("無法解析綠界列印回應", 422, wantsJson);
    }

    if (wantsJson) {
      return jsonResponse({
        action: extracted.action,
        fields: extracted.fields,
      });
    }

    const bridgeHtml = buildAutoSubmitFormHtml(
      extracted.action,
      extracted.fields,
      "列印託運單",
    );
    return corsHtmlResponse(bridgeHtml);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return respondError(`Print failed: ${msg}`, 502, wantsJson);
  }
});

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
