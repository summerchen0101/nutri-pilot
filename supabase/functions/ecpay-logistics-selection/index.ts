/**
 * GET ?orderId=&vendorId= — 綠界 V1 超商門市地圖（Express/map）或宅配略過
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  corsHeaders,
  corsHtmlResponse,
  jsonResponse,
  wantsJsonResponse,
} from "../_shared/cors.ts";
import { getAppUrl, getSupabaseFunctionsBase } from "../_shared/ecpay.ts";
import {
  buildAutoSubmitFormHtml,
  buildLogisticsErrorHtml,
  buildPopupReturnHtml,
} from "../_shared/ecpay-popup-html.ts";
import {
  assertLogisticsSenderReady,
  getEcpayLogisticsConfig,
  verifyEcpayLogisticsCheckMacValue,
} from "../_shared/ecpay-logistics.ts";
import {
  appendCheckMac,
  buildCvsMapFormFields,
  buildLogisticsExtraData,
  createVendorLogisticsTradeNo,
  logisticsV1Urls,
} from "../_shared/ecpay-logistics-v1.ts";
import { markHomeVendorLogisticsReady } from "../_shared/ecpay-logistics-operations.ts";
import {
  isCheckoutSnapshot,
  isCvsCodShippingCodeEdge,
} from "../_shared/shop-checkout-core.ts";

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

  const backUrl = `${Deno.env.get("APP_URL")?.replace(/\/$/, "") ?? ""}/shop?checkout=1`;

  if (!orderId || !vendorId) {
    return respondError("Missing orderId or vendorId", backUrl, 400, wantsJson);
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
    .select("id, user_id, status, checkout_snapshot")
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
  const draft = snap.logisticsByVendor[vendorId];
  if (!vendor || !draft) {
    return respondError("Vendor not in order", backUrl, 422, wantsJson);
  }

  if (draft.logisticsType === "HOME") {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    try {
      await markHomeVendorLogisticsReady(admin, orderId, vendorId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return respondError(msg, backUrl, 422, wantsJson);
    }
    if (wantsJson) {
      return jsonResponse({ skipMap: true, logisticsType: "HOME" });
    }
    const appUrl = getAppUrl();
    const redirectUrl =
      `${appUrl}/shop?checkout=1&orderId=${orderId}&logisticsDone=1&vendorId=${vendorId}`;
    return corsHtmlResponse(
      buildPopupReturnHtml({
        redirectUrl,
        navigateOpener: false,
        reusePopup: true,
      }),
    );
  }

  let cfg;
  try {
    cfg = getEcpayLogisticsConfig();
    assertLogisticsSenderReady(cfg);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return respondError(msg, backUrl, 500, wantsJson);
  }

  const merchantTradeNo = draft.merchantLogisticsTradeNo ??
    createVendorLogisticsTradeNo(orderId, vendorId);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);
  const nextDraft = {
    ...draft,
    merchantLogisticsTradeNo: merchantTradeNo,
    isCollection: isCvsCodShippingCodeEdge(vendor.shippingMethodCode) ?
      "Y" as const
      : "N" as const,
  };
  await admin
    .from("orders")
    .update({
      checkout_snapshot: {
        ...snap,
        logisticsByVendor: {
          ...snap.logisticsByVendor,
          [vendorId]: nextDraft,
        },
      },
    })
    .eq("id", orderId);

  const fnBase = getSupabaseFunctionsBase();
  const mapReturnUrl =
    `${fnBase}/functions/v1/ecpay-logistics-map-return?orderId=${orderId}&vendorId=${vendorId}`;

  const mapFields = appendCheckMac(
    buildCvsMapFormFields({
      merchantId: cfg.merchantId,
      merchantTradeNo,
      logisticsSubType: draft.logisticsSubType,
      isCollection: nextDraft.isCollection ?? "N",
      serverReplyUrl: mapReturnUrl,
      extraData: buildLogisticsExtraData(orderId, vendorId),
      device: "1",
    }),
    cfg.hashKey,
    cfg.hashIv,
  );

  const urls = logisticsV1Urls(cfg.host);

  if (!urls.map.includes("/Express/map")) {
    return respondError("Invalid map URL", backUrl, 500, wantsJson);
  }
  if (urls.map.includes("/v2/")) {
    return respondError("Must use V1 Express/map", backUrl, 500, wantsJson);
  }

  const checkMacSelfOk = verifyEcpayLogisticsCheckMacValue(
    mapFields,
    cfg.hashKey,
    cfg.hashIv,
  );
  if (!checkMacSelfOk) {
    console.error("[ecpay-logistics-selection] CheckMac self-verify failed", {
      merchantId: cfg.merchantId,
      merchantTradeNo,
    });
    return respondError("CheckMac self-verify failed", backUrl, 500, wantsJson);
  }

  if (wantsJson) {
    return jsonResponse({
      bridgeVersion: "v1-map",
      action: urls.map,
      fields: mapFields,
      logisticsType: "CVS",
      debug: { merchantId: cfg.merchantId, checkMacSelfOk: true },
    });
  }

  const html = buildAutoSubmitFormHtml(urls.map, mapFields, "綠界超商門市選擇");
  return corsHtmlResponse(html);
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
