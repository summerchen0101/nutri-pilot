/**
 * POST — 綠界物流 V1 ServerReplyURL（建單回覆 + 貨態更新）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { parseEcpayFormBody } from "../_shared/ecpay.ts";
import {
  generateEcpayLogisticsCheckMacValue,
  getEcpayLogisticsConfig,
} from "../_shared/ecpay-logistics.ts";
import {
  isCheckoutSnapshot,
  recomputeLogisticsCompleted,
} from "../_shared/shop-checkout-core.ts";
import type { CheckoutSnapshot } from "../_shared/shop-checkout-types.ts";

const SHIPPED_RTN = new Set(["2030", "2063", "2073", "3018", "3024"]);
const DELIVERED_RTN = new Set(["2067", "3022"]);
const SHIPPED_STATUS = new Set(["301", "302", "2030", "2063", "2073"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const cfg = getEcpayLogisticsConfig();
  const raw = await req.text();
  const params = parseEcpayFormBody(raw);

  const receivedMac = params.CheckMacValue ?? "";
  const paramsNoMac = { ...params };
  delete paramsNoMac.CheckMacValue;
  const expected = generateEcpayLogisticsCheckMacValue(
    paramsNoMac,
    cfg.hashKey,
    cfg.hashIv,
  );

  if (receivedMac && receivedMac !== expected) {
    console.error("[ecpay-logistics-return] CheckMac mismatch");
    return new Response("0|CheckMac Error", { status: 400 });
  }

  const tradeNo = params.AllPayLogisticsID ?? params.LogisticsTradeNo ?? "";
  const merchantTradeNo = params.MerchantTradeNo ?? "";
  const rtnCode = params.RtnCode ?? "";
  const logisticsStatus = params.LogisticsStatus ?? params.Status ?? "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  if (tradeNo) {
    const { data: subOrder } = await admin
      .from("sub_orders")
      .select("id, status, ecpay_logistics_meta")
      .eq("ecpay_logistics_trade_no", tradeNo)
      .maybeSingle();

    if (subOrder) {
      await updateSubOrderStatus(admin, subOrder, params, rtnCode, logisticsStatus);
    } else if (merchantTradeNo) {
      await updatePendingOrderSnapshot(
        admin,
        merchantTradeNo,
        tradeNo,
        params,
      );
    }
  }

  return new Response("1|OK", {
    headers: { "Content-Type": "text/plain" },
  });
});

async function updateSubOrderStatus(
  admin: ReturnType<typeof createClient>,
  subOrder: { id: string; status: string; ecpay_logistics_meta: unknown },
  params: Record<string, string>,
  rtnCode: string,
  logisticsStatus: string,
): Promise<void> {
  const meta = {
    ...(typeof subOrder.ecpay_logistics_meta === "object" &&
        subOrder.ecpay_logistics_meta != null ?
      subOrder.ecpay_logistics_meta as Record<string, unknown>
      : {}),
    lastServerCallback: {
      at: new Date().toISOString(),
      params,
    },
  };

  let nextStatus = subOrder.status;
  const ls = String(logisticsStatus);
  const rc = String(rtnCode);

  if (
    ls.includes("配送") || SHIPPED_STATUS.has(ls) || SHIPPED_RTN.has(rc) ||
    rc === "300"
  ) {
    nextStatus = "shipped";
  }
  if (ls.includes("完成") || ls === "302" || DELIVERED_RTN.has(rc)) {
    nextStatus = "delivered";
  }

  await admin
    .from("sub_orders")
    .update({
      status: nextStatus,
      tracking_number: params.CVSPaymentNo ?? params.BookingNote ??
        params.ShipmentNo ?? subOrder.id,
      ecpay_logistics_meta: meta,
      shipped_at: nextStatus === "shipped" || nextStatus === "delivered" ?
        new Date().toISOString()
        : undefined,
    })
    .eq("id", subOrder.id);
}

async function updatePendingOrderSnapshot(
  admin: ReturnType<typeof createClient>,
  merchantLogisticsTradeNo: string,
  tradeNo: string,
  params: Record<string, string>,
): Promise<void> {
  const { data: orders, error } = await admin
    .from("orders")
    .select("id, status, checkout_snapshot")
    .eq("status", "pending");

  if (error || !orders?.length) return;

  for (const order of orders) {
    const snap = order.checkout_snapshot;
    if (!isCheckoutSnapshot(snap)) continue;

    let changed = false;
    const nextVendors = { ...snap.logisticsByVendor };

    for (const [vendorId, draft] of Object.entries(nextVendors)) {
      if (!draft) continue;
      if (draft.merchantLogisticsTradeNo !== merchantLogisticsTradeNo) {
        continue;
      }
      nextVendors[vendorId] = {
        ...draft,
        ecpayLogisticsTradeNo: tradeNo || draft.ecpayLogisticsTradeNo,
        logisticsCreated: true,
        meta: {
          ...(draft.meta ?? {}),
          serverCallbackBeforePay: params,
        },
      };
      changed = true;
    }

    if (!changed) continue;

    const nextSnap: CheckoutSnapshot = {
      ...snap,
      logisticsByVendor: nextVendors,
      logisticsCompleted: false,
    };
    nextSnap.logisticsCompleted = recomputeLogisticsCompleted(nextSnap);

    await admin
      .from("orders")
      .update({ checkout_snapshot: nextSnap })
      .eq("id", order.id);
    break;
  }
}
