/**
 * POST — 綠界 V1 門市地圖 ServerReplyURL
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { getSupabaseFunctionsBase, parseEcpayFormBody, resolveAppOriginFromUrl } from "../_shared/ecpay.ts";
import { buildPopupReturnHtml } from "../_shared/ecpay-popup-html.ts";
import {
  buildShopReturnUrl,
  isNativeReturnRequested,
} from "../_shared/native-app-return.ts";
import {
  applyVendorLogisticsCompleted,
  createLogisticsForVendor,
} from "../_shared/ecpay-logistics-operations.ts";
import {
  buildLogisticsExtraData,
  createVendorLogisticsTradeNo,
} from "../_shared/ecpay-logistics-v1.ts";
import {
  isCheckoutSnapshot,
  isCvsCodShippingCodeEdge,
  recomputeLogisticsCompleted,
} from "../_shared/shop-checkout-core.ts";
import type { CheckoutSnapshot, LogisticsDraft } from "../_shared/shop-checkout-types.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const reqUrl = new URL(req.url);
  const appOrigin = resolveAppOriginFromUrl(reqUrl);
  const nativeReturn = isNativeReturnRequested(reqUrl);
  const orderId = reqUrl.searchParams.get("orderId")?.trim() ?? "";
  const vendorId = reqUrl.searchParams.get("vendorId")?.trim() ?? "";

  if (!orderId || !vendorId) {
    return new Response("Missing orderId or vendorId", { status: 400 });
  }

  const raw = req.method === "POST" ? await req.text() : reqUrl.search.slice(1);
  const params = parseEcpayFormBody(raw);

  const storeId = params.CVSStoreID ?? "";
  if (!storeId) {
    return popupError(appOrigin, orderId, vendorId, "未收到門市資訊", nativeReturn);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select(
      "id, status, recipient_name, recipient_phone, recipient_address_full, checkout_snapshot",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return new Response("Order not found", { status: 404 });
  }

  const snap = order.checkout_snapshot;
  if (!isCheckoutSnapshot(snap)) {
    return new Response("Invalid snapshot", { status: 422 });
  }

  const vendor = snap.vendors.find((v) => v.vendorId === vendorId);
  const existing = snap.logisticsByVendor[vendorId];
  if (!vendor || !existing) {
    return new Response("Vendor not in order", { status: 422 });
  }

  const expectedExtra = buildLogisticsExtraData(orderId, vendorId);
  const extra = params.ExtraData ?? "";
  if (extra && extra !== expectedExtra) {
    console.warn("[ecpay-logistics-map-return] ExtraData mismatch", extra, expectedExtra);
  }

  const tradeNoFromEcpay = params.MerchantTradeNo ?? "";
  const tradeNo = tradeNoFromEcpay ||
    existing.merchantLogisticsTradeNo ||
    createVendorLogisticsTradeNo(orderId, vendorId);

  let draft: LogisticsDraft = {
    ...existing,
    merchantLogisticsTradeNo: tradeNo,
    storeSelected: true,
    cvsStoreId: storeId,
    cvsStoreName: params.CVSStoreName ?? existing.cvsStoreName,
    cvsStoreAddress: params.CVSAddress ?? existing.cvsStoreAddress,
    meta: {
      ...(existing.meta ?? {}),
      mapReturn: params,
    },
  };

  let nextSnap: CheckoutSnapshot = {
    ...snap,
    logisticsByVendor: { ...snap.logisticsByVendor, [vendorId]: draft },
    logisticsCompleted: false,
  };
  await admin
    .from("orders")
    .update({ checkout_snapshot: nextSnap })
    .eq("id", orderId);

  const isCod = isCvsCodShippingCodeEdge(vendor.shippingMethodCode);

  if (isCod) {
    const fnBase = getSupabaseFunctionsBase();
    const serverReturn = `${fnBase}/functions/v1/ecpay-logistics-return`;
    const orderForCreate = {
      ...order,
      checkout_snapshot: nextSnap,
    };
    const createRes = await createLogisticsForVendor(
      admin,
      orderForCreate,
      vendorId,
      serverReturn,
    );
    if (!createRes.ok) {
      return popupError(
        appOrigin,
        orderId,
        vendorId,
        createRes.error ?? "物流建單失敗",
        nativeReturn,
      );
    }
    const { data: refreshed } = await admin
      .from("orders")
      .select("checkout_snapshot")
      .eq("id", orderId)
      .maybeSingle();
    if (refreshed && isCheckoutSnapshot(refreshed.checkout_snapshot)) {
      const d = refreshed.checkout_snapshot.logisticsByVendor[vendorId];
      if (d) draft = d;
    }
  } else {
    draft = applyVendorLogisticsCompleted(draft, vendor.shippingMethodCode);
    nextSnap = {
      ...nextSnap,
      logisticsByVendor: { ...nextSnap.logisticsByVendor, [vendorId]: draft },
    };
    nextSnap.logisticsCompleted = recomputeLogisticsCompleted(nextSnap);
    await admin
      .from("orders")
      .update({ checkout_snapshot: nextSnap })
      .eq("id", orderId);
  }

  const redirectUrl = buildShopReturnUrl(
    appOrigin,
    {
      checkout: "1",
      orderId,
      logisticsDone: "1",
      vendorId,
    },
    nativeReturn,
  );

  return new Response(
    buildPopupReturnHtml({
      redirectUrl,
      navigateOpener: true,
      closePopup: true,
    }),
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
});

function popupError(
  appOrigin: string,
  orderId: string,
  vendorId: string,
  message: string,
  nativeReturn: boolean,
): Response {
  const redirectUrl = buildShopReturnUrl(
    appOrigin,
    {
      checkout: "1",
      orderId,
      logisticsError: "1",
      vendorId,
      msg: message,
    },
    nativeReturn,
  );
  return new Response(
    buildPopupReturnHtml({
      redirectUrl,
      navigateOpener: true,
      closePopup: true,
    }),
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
