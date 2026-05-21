/**
 * GET ?orderId=&vendorId= — 綠界 V2 門市／宅配選擇（popup HTML redirect）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  corsHeaders,
  corsHtmlResponse,
  corsRedirect,
  jsonResponse,
  wantsJsonResponse,
} from "../_shared/cors.ts";
import { getAppUrl, getSupabaseFunctionsBase } from "../_shared/ecpay.ts";
import {
  buildAutoSubmitFormHtml,
  buildLogisticsErrorHtml,
} from "../_shared/ecpay-popup-html.ts";
import {
  assertLogisticsSenderReady,
  buildLogisticsSelectionPayload,
  extractLogisticsAutoSubmitForm,
  formatLogisticsV2Error,
  getEcpayLogisticsConfig,
  logisticsV2Urls,
  requestLogisticsSelectionPage,
} from "../_shared/ecpay-logistics.ts";
import { isCheckoutSnapshot } from "../_shared/shop-checkout-core.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const url = new URL(req.url);
  const wantsJson = wantsJsonResponse(req, url);
  const orderId = url.searchParams.get("orderId")?.trim() ?? "";
  const vendorId = url.searchParams.get("vendorId")?.trim() ?? "";
  const token = url.searchParams.get("token")?.trim() ??
    req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  const appUrl = getAppUrl();
  const backUrl = `${appUrl}/shop?checkout=1`;

  if (!orderId || !vendorId) {
    return respondError("Missing orderId or vendorId", backUrl, 400, wantsJson);
  }

  let cfg;
  try {
    cfg = getEcpayLogisticsConfig();
    assertLogisticsSenderReady(cfg);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return respondError(msg, backUrl, 500, wantsJson);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  if (!token) {
    return respondError("Missing auth", backUrl, 401, wantsJson);
  }

  const supabase = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return respondError("Unauthorized", backUrl, 401, wantsJson);
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      "id, user_id, status, recipient_name, recipient_phone, recipient_address_full, checkout_snapshot",
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderErr || !order) {
    return respondError("Order not found", backUrl, 404, wantsJson);
  }
  if (order.status !== "pending") {
    return respondError("Order not pending", backUrl, 422, wantsJson);
  }

  const snap = order.checkout_snapshot;
  if (!isCheckoutSnapshot(snap)) {
    return respondError("Invalid snapshot", backUrl, 422, wantsJson);
  }

  const vendor = snap.vendors.find((v) => v.vendorId === vendorId);
  if (!vendor) {
    return respondError("Vendor not in order", backUrl, 422, wantsJson);
  }

  if (!snap.logisticsByVendor[vendorId]) {
    return respondError("No logistics draft", backUrl, 422, wantsJson);
  }

  const fnBase = getSupabaseFunctionsBase();
  const clientReturn =
    `${fnBase}/functions/v1/ecpay-logistics-client-return?orderId=${orderId}&vendorId=${vendorId}`;
  const serverReturn = `${fnBase}/functions/v1/ecpay-logistics-return`;

  const payload = buildLogisticsSelectionPayload({
    goodsAmount: vendor.itemsSubtotal,
    goodsName: vendor.vendorName,
    senderName: cfg.senderName,
    senderZipCode: cfg.senderZipCode,
    senderAddress: cfg.senderAddress,
    serverReplyUrl: serverReturn,
    clientReplyUrl: clientReturn,
    receiverName: String(order.recipient_name ?? ""),
    receiverCellPhone: String(order.recipient_phone ?? ""),
    receiverAddress: String(order.recipient_address_full ?? ""),
  });

  const urls = logisticsV2Urls(cfg.host);

  try {
    const result = await requestLogisticsSelectionPage(
      urls.selection,
      cfg.merchantId,
      payload,
      cfg.hashKey,
      cfg.hashIv,
    );

    if (result.redirectUrl) {
      if (wantsJson) {
        return jsonResponse({ redirectUrl: result.redirectUrl });
      }
      return corsRedirect(result.redirectUrl);
    }

    if (result.html) {
      const extracted = extractLogisticsAutoSubmitForm(result.html);
      if (extracted) {
        if (wantsJson) {
          return jsonResponse({
            action: extracted.action,
            fields: extracted.fields,
          });
        }
        const bridgeHtml = buildAutoSubmitFormHtml(
          extracted.action,
          extracted.fields,
          "綠界物流選擇",
        );
        return corsHtmlResponse(bridgeHtml);
      }
      console.error(
        "[ecpay-logistics-selection] could not parse ECPay HTML:",
        result.html.slice(0, 200),
      );
      if (wantsJson) {
        return jsonResponse({ error: "無法解析綠界物流回應" }, 422);
      }
      return corsHtmlResponse(result.html);
    }

    const errMsg = formatLogisticsV2Error(result);
    console.error("[ecpay-logistics-selection]", {
      transCode: result.transCode,
      transMsg: result.transMsg,
      rtnCode: result.rtnCode,
      rtnMsg: result.rtnMsg,
    });
    return respondError(errMsg, backUrl, 422, wantsJson);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ecpay-logistics-selection]", msg);
    return respondError(msg, backUrl, 500, wantsJson);
  }
});

function respondError(
  message: string,
  backUrl: string,
  status: number,
  wantsJson: boolean,
): Response {
  if (wantsJson) {
    return jsonResponse({ error: message }, status);
  }
  return corsHtmlResponse(buildLogisticsErrorHtml(message, backUrl), status);
}
