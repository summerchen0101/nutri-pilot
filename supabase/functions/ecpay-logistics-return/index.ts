/**
 * POST — 綠界物流 ServerReplyURL（貨態更新）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { parseEcpayFormBody } from "../_shared/ecpay.ts";
import { generateEcpayLogisticsCheckMacValue } from "../_shared/ecpay-logistics.ts";
import { getEcpayLogisticsConfig } from "../_shared/ecpay-logistics.ts";

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
      if (ls.includes("配送") || ls === "301" || rtnCode === "300") {
        nextStatus = "shipped";
      }
      if (ls.includes("完成") || ls === "302" || rtnCode === "302") {
        nextStatus = "delivered";
      }

      await admin
        .from("sub_orders")
        .update({
          status: nextStatus,
          tracking_number: params.CVSPaymentNo ?? params.BookingNote ??
            params.TrackingNumber ?? subOrder.id,
          ecpay_logistics_meta: meta,
          shipped_at: nextStatus === "shipped" || nextStatus === "delivered" ?
            new Date().toISOString()
            : undefined,
        })
        .eq("id", subOrder.id);
    }
  }

  return new Response("1|OK", {
    headers: { "Content-Type": "text/plain" },
  });
});
