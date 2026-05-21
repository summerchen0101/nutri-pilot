/**
 * POST — 綠界 PaymentInfoURL（ATM／超商代碼取號，訂單維持 pending）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  getEcpayPaymentConfig,
  parseEcpayFormBody,
  verifyEcpayCheckMacValue,
} from "../_shared/ecpay.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("0|Method", { status: 405 });
  }

  const pay = getEcpayPaymentConfig();
  const raw = await req.text();
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.includes("\"Data\"")) {
    console.warn(
      "[ecpay-payment-info] envelope-style callback detected; flat CheckMac expected",
    );
  }
  const params = parseEcpayFormBody(raw);

  if (!verifyEcpayCheckMacValue(params, pay.hashKey, pay.hashIv, true)) {
    return new Response("0|CheckMac Error", { status: 400 });
  }

  const merchantTradeNo = params.MerchantTradeNo ?? "";
  if (!merchantTradeNo) {
    return new Response("1|OK", { headers: { "Content-Type": "text/plain" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: order } = await admin
    .from("orders")
    .select("id, status, order_metadata")
    .eq("merchant_order_no", merchantTradeNo)
    .maybeSingle();

  if (!order || order.status !== "pending") {
    return new Response("1|OK", { headers: { "Content-Type": "text/plain" } });
  }

  const prevMeta = typeof order.order_metadata === "object" &&
      order.order_metadata != null ?
    order.order_metadata as Record<string, unknown>
    : {};

  await admin
    .from("orders")
    .update({
      order_metadata: {
        ...prevMeta,
        ecpay: {
          ...(typeof prevMeta.ecpay === "object" && prevMeta.ecpay != null ?
            prevMeta.ecpay as Record<string, unknown>
            : {}),
          paymentInfo: params,
          paymentPending: true,
          paymentInfoAt: new Date().toISOString(),
        },
      },
    })
    .eq("id", order.id);

  return new Response("1|OK", { headers: { "Content-Type": "text/plain" } });
});
