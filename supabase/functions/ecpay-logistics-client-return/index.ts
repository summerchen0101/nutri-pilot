/**
 * POST — 綠界物流 ClientReplyURL（popup 返回）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { getAppUrl } from "../_shared/ecpay.ts";
import { buildPopupReturnHtml } from "../_shared/ecpay-popup-html.ts";
import {
  getEcpayLogisticsConfig,
  logisticsV2Urls,
  parseLogisticsCallbackBody,
  postEcpayLogisticsV2Json,
  resolveLogisticsClientReturnData,
} from "../_shared/ecpay-logistics.ts";
import {
  isCheckoutSnapshot,
  recomputeLogisticsCompleted,
} from "../_shared/shop-checkout-core.ts";
import type { CheckoutSnapshot, LogisticsDraft } from "../_shared/shop-checkout-types.ts";

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickRtnCode(obj: Record<string, unknown>): number | null {
  for (const k of ["RtnCode", "rtnCode", "RTNCode"]) {
    const v = obj[k];
    if (v == null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const reqUrl = new URL(req.url);
  const orderId = reqUrl.searchParams.get("orderId")?.trim() ?? "";
  const vendorId = reqUrl.searchParams.get("vendorId")?.trim() ?? "";

  if (!orderId || !vendorId) {
    return new Response("Missing orderId or vendorId", { status: 400 });
  }

  const cfg = getEcpayLogisticsConfig();
  const raw = req.method === "POST" ? await req.text() : reqUrl.search.slice(1);
  const contentType = req.headers.get("Content-Type") ?? undefined;
  const { flat, decrypted } = parseLogisticsCallbackBody(
    raw,
    contentType,
    cfg.hashKey,
    cfg.hashIv,
  );

  const resolved = resolveLogisticsClientReturnData({
    flat,
    decrypted,
    hashKey: cfg.hashKey,
    hashIv: cfg.hashIv,
  });
  const { inner } = resolved;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, status, checkout_snapshot, recipient_address_full")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return new Response("Order not found", { status: 404 });
  }

  const snap = order.checkout_snapshot;
  if (!isCheckoutSnapshot(snap)) {
    return new Response("Invalid snapshot", { status: 422 });
  }

  const existing = snap.logisticsByVendor[vendorId];
  if (!existing) {
    return new Response("No logistics draft", { status: 422 });
  }

  const rtnCode = pickRtnCode(inner);
  const selectionOk = rtnCode === null || rtnCode === 1;

  const returnedLogisticsType = pickString(inner, [
    "LogisticsType",
    "logisticsType",
  ]);
  const returnedSubType = pickString(inner, [
    "LogisticsSubType",
    "logisticsSubType",
  ]);
  const receiverAddress = pickString(inner, [
    "ReceiverAddress",
    "receiverAddress",
  ]);

  let tradeNo = "";
  let storeId = "";
  let storeName = "";
  let storeAddr = "";
  const meta: Record<string, unknown> = {
    clientReturn: flat,
    clientReturnInner: inner,
    ...(decrypted ? { clientReturnDecrypted: decrypted } : {}),
  };

  const urls = logisticsV2Urls(cfg.host);
  const tempId = pickString(inner, [
    "TempLogisticsID",
    "TempLogisticsId",
    "tempLogisticsID",
  ]) || existing.tempLogisticsId || "";
  const hasValidTempId = Boolean(tempId && tempId !== "0");

  if (hasValidTempId && selectionOk) {
    try {
      const createRes = await postEcpayLogisticsV2Json(
        urls.createByTemp,
        cfg.merchantId,
        { TempLogisticsID: tempId },
        cfg.hashKey,
        cfg.hashIv,
      );
      meta.createByTemp = createRes;
      const createInner = (createRes._decrypted ?? createRes) as Record<
        string,
        unknown
      >;
      tradeNo = pickString(createInner, [
        "LogisticsTradeNo",
        "MerchantTradeNo",
        "AllPayLogisticsID",
      ]);

      if (tradeNo) {
        const queryRes = await postEcpayLogisticsV2Json(
          urls.query,
          cfg.merchantId,
          { LogisticsTradeNo: tradeNo },
          cfg.hashKey,
          cfg.hashIv,
        );
        meta.query = queryRes;
        const q = (queryRes._decrypted ?? queryRes) as Record<string, unknown>;
        storeId = pickString(q, ["CVSStoreID", "StoreID", "ReceiverStoreID"]);
        storeName = pickString(q, ["CVSStoreName", "StoreName"]);
        storeAddr = pickString(q, [
          "CVSAddress",
          "StoreAddress",
          "ReceiverStoreAddress",
        ]);
      }
    } catch (e) {
      meta.error = e instanceof Error ? e.message : String(e);
    }
  } else if (!hasValidTempId) {
    meta.error = meta.error ??
      `缺少 TempLogisticsID（RtnCode=${String(rtnCode ?? "null")}）`;
  } else if (!selectionOk) {
    meta.error = meta.error ??
      (pickString(inner, ["RtnMsg", "rtnMsg"]) ||
        `綠界回傳失敗（RtnCode=${rtnCode}）`);
  }

  const logisticsType =
    returnedLogisticsType === "CVS" || returnedLogisticsType === "HOME" ?
      returnedLogisticsType
    : existing.logisticsType;

  const homeAddr = receiverAddress ||
    String(order.recipient_address_full ?? "");

  const updatedDraft: LogisticsDraft = {
    ...existing,
    logisticsType,
    logisticsSubType: returnedSubType || existing.logisticsSubType,
    completed: hasValidTempId && selectionOk && !meta.error,
    tempLogisticsId: tempId || existing.tempLogisticsId,
    ecpayLogisticsTradeNo: tradeNo || existing.ecpayLogisticsTradeNo,
    cvsStoreId: storeId || existing.cvsStoreId,
    cvsStoreName: storeName || existing.cvsStoreName,
    cvsStoreAddress: storeAddr || existing.cvsStoreAddress,
    shippingAddress: logisticsType === "HOME" ?
      (homeAddr || existing.shippingAddress)
      : (storeAddr || existing.shippingAddress),
    meta: { ...(existing.meta ?? {}), ...meta },
  };

  const nextSnap: CheckoutSnapshot = {
    ...snap,
    logisticsByVendor: {
      ...snap.logisticsByVendor,
      [vendorId]: updatedDraft,
    },
    logisticsCompleted: false,
  };
  nextSnap.logisticsCompleted = recomputeLogisticsCompleted(nextSnap);

  await admin
    .from("orders")
    .update({ checkout_snapshot: nextSnap })
    .eq("id", orderId);

  const appUrl = getAppUrl();
  const redirectUrl =
    `${appUrl}/shop?checkout=1&orderId=${orderId}&logisticsDone=1&vendorId=${vendorId}`;

  return new Response(
    buildPopupReturnHtml({
      redirectUrl,
      navigateOpener: false,
      reusePopup: true,
    }),
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
});
