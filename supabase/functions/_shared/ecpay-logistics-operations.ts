import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import {
  assertLogisticsSenderReady,
  getEcpayLogisticsConfig,
  type EcpayLogisticsConfig,
} from "./ecpay-logistics.ts";
import {
  buildCvsCreateFormFields,
  buildHomeCreateFormFields,
  createLogisticsOrderV1,
  createVendorLogisticsTradeNo,
  pickLogisticsId,
} from "./ecpay-logistics-v1.ts";
import {
  isCheckoutSnapshot,
  isCvsCodShippingCodeEdge,
  recomputeLogisticsCompleted,
} from "./shop-checkout-core.ts";
import type {
  CheckoutSnapshot,
  LogisticsDraft,
} from "./shop-checkout-types.ts";

export function isVendorLogisticsStepComplete(
  draft: LogisticsDraft | null | undefined,
  shippingMethodCode: string | null | undefined,
): boolean {
  if (!draft) return false;
  if (draft.logisticsType === "HOME") {
    return draft.completed === true;
  }
  if (isCvsCodShippingCodeEdge(shippingMethodCode)) {
    return draft.logisticsCreated === true &&
      Boolean(draft.ecpayLogisticsTradeNo);
  }
  return draft.storeSelected === true && Boolean(draft.cvsStoreId);
}

export function applyVendorLogisticsCompleted(
  draft: LogisticsDraft,
  shippingMethodCode: string | null | undefined,
): LogisticsDraft {
  return {
    ...draft,
    completed: isVendorLogisticsStepComplete(draft, shippingMethodCode),
  };
}

interface OrderForLogistics {
  id: string;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_address_full: string | null;
  checkout_snapshot: unknown;
}

function extractZipFromAddress(address: string): string {
  const m = address.match(/^(\d{3,6})/);
  return m?.[1]?.slice(0, 6) ?? "100";
}

async function persistSnapshot(
  admin: SupabaseClient,
  orderId: string,
  snap: CheckoutSnapshot,
): Promise<void> {
  const next: CheckoutSnapshot = {
    ...snap,
    logisticsCompleted: recomputeLogisticsCompleted(snap),
  };
  const { error } = await admin
    .from("orders")
    .update({ checkout_snapshot: next })
    .eq("id", orderId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function markHomeVendorLogisticsReady(
  admin: SupabaseClient,
  orderId: string,
  vendorId: string,
  homeLogisticsSubType?: string,
): Promise<void> {
  const { data: order, error } = await admin
    .from("orders")
    .select(
      "id, recipient_name, recipient_phone, recipient_address_full, checkout_snapshot",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) throw new Error("Order not found");
  const snap = order.checkout_snapshot;
  if (!isCheckoutSnapshot(snap)) throw new Error("Invalid snapshot");

  const vendor = snap.vendors.find((v) => v.vendorId === vendorId);
  const draft = snap.logisticsByVendor[vendorId];
  if (!vendor || !draft) throw new Error("Vendor not in order");

  const addr = String(order.recipient_address_full ?? "").trim();
  if (addr.length < 6) {
    throw new Error("請填寫完整收件地址");
  }

  const tradeNo = draft.merchantLogisticsTradeNo ??
    createVendorLogisticsTradeNo(orderId, vendorId);

  let subType = draft.logisticsSubType;
  if (homeLogisticsSubType === "TCAT" || homeLogisticsSubType === "POST") {
    subType = homeLogisticsSubType;
  }

  const updated: LogisticsDraft = applyVendorLogisticsCompleted({
    ...draft,
    logisticsType: "HOME",
    logisticsSubType: subType,
    merchantLogisticsTradeNo: tradeNo,
    storeSelected: false,
    logisticsCreated: false,
    shippingAddress: addr,
    isCollection: "N",
    completed: true,
  }, vendor.shippingMethodCode);

  snap.logisticsByVendor[vendorId] = updated;
  await persistSnapshot(admin, orderId, snap);
}

export async function createLogisticsForVendor(
  admin: SupabaseClient,
  order: OrderForLogistics,
  vendorId: string,
  serverReplyUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const snap = order.checkout_snapshot;
  if (!isCheckoutSnapshot(snap)) {
    return { ok: false, error: "Invalid snapshot" };
  }

  const vendor = snap.vendors.find((v) => v.vendorId === vendorId);
  const draft = snap.logisticsByVendor[vendorId];
  if (!vendor || !draft) {
    return { ok: false, error: "Vendor not in order" };
  }

  if (draft.logisticsCreated && draft.ecpayLogisticsTradeNo) {
    return { ok: true };
  }

  let cfg: EcpayLogisticsConfig;
  try {
    cfg = getEcpayLogisticsConfig();
    assertLogisticsSenderReady(cfg);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  const tradeNo = draft.merchantLogisticsTradeNo ??
    createVendorLogisticsTradeNo(order.id, vendorId);
  const isCod = isCvsCodShippingCodeEdge(vendor.shippingMethodCode);
  const isCollection: "Y" | "N" = isCod ? "Y" : "N";

  const recipientName = String(order.recipient_name ?? "").trim();
  const recipientPhone = String(order.recipient_phone ?? "").trim();
  if (!recipientName || !/^09\d{8}$/.test(recipientPhone)) {
    return { ok: false, error: "收件人姓名或手機格式不正確" };
  }

  const recipient = {
    name: recipientName,
    cellPhone: recipientPhone,
  };

  const vendorCtx = {
    vendorName: vendor.vendorName,
    itemsSubtotal: vendor.itemsSubtotal,
    logisticsSubType: draft.logisticsSubType,
    isCollection,
    receiverStoreId: draft.cvsStoreId ?? undefined,
  };

  let baseFields: Record<string, string>;

  if (draft.logisticsType === "HOME") {
    const addr = String(order.recipient_address_full ?? draft.shippingAddress ?? "")
      .trim();
    if (addr.length < 6) {
      return { ok: false, error: "宅配地址不完整" };
    }
    baseFields = buildHomeCreateFormFields(cfg, {
      merchantTradeNo: tradeNo,
      serverReplyUrl,
      recipient: {
        ...recipient,
        zipCode: extractZipFromAddress(addr),
        address: addr,
      },
      vendor: vendorCtx,
    });
  } else {
    if (!draft.cvsStoreId) {
      return { ok: false, error: "請先選擇超商門市" };
    }
    baseFields = buildCvsCreateFormFields(cfg, {
      merchantTradeNo: tradeNo,
      serverReplyUrl,
      recipient,
      vendor: vendorCtx,
    });
  }

  const result = await createLogisticsOrderV1(cfg, baseFields);
  const meta = { ...(draft.meta ?? {}) };

  if (!result.ok) {
    meta.createError = result.errorMessage;
    meta.createResponse = result.params;
    snap.logisticsByVendor[vendorId] = {
      ...draft,
      merchantLogisticsTradeNo: tradeNo,
      meta,
      completed: false,
    };
    await persistSnapshot(admin, order.id, snap);
    return { ok: false, error: result.errorMessage };
  }

  const logisticsId = pickLogisticsId(result.params, result.queryParams);
  const q = result.queryParams ?? {};
  const storeId = q.CVSStoreID ?? draft.cvsStoreId;
  const storeName = q.CVSStoreName ?? draft.cvsStoreName;
  const storeAddr = q.CVSAddress ?? draft.cvsStoreAddress;

  const updated: LogisticsDraft = applyVendorLogisticsCompleted({
    ...draft,
    merchantLogisticsTradeNo: tradeNo,
    isCollection,
    logisticsCreated: true,
    ecpayLogisticsTradeNo: logisticsId || draft.ecpayLogisticsTradeNo,
    cvsStoreId: storeId ?? draft.cvsStoreId,
    cvsStoreName: storeName ?? draft.cvsStoreName,
    cvsStoreAddress: storeAddr ?? draft.cvsStoreAddress,
    shippingAddress: draft.logisticsType === "HOME" ?
      String(order.recipient_address_full ?? draft.shippingAddress ?? "")
      : (storeAddr ?? draft.cvsStoreAddress),
    meta: {
      ...meta,
      createResponse: result.params,
      queryResponse: result.queryParams,
    },
  }, vendor.shippingMethodCode);

  snap.logisticsByVendor[vendorId] = updated;
  await persistSnapshot(admin, order.id, snap);
  return { ok: true };
}

/** 付款成功後：為尚未建單的廠商建立 V1 物流單 */
export async function createPendingLogisticsForOrder(
  admin: SupabaseClient,
  order: OrderForLogistics,
  serverReplyUrl: string,
): Promise<void> {
  const snap = order.checkout_snapshot;
  if (!isCheckoutSnapshot(snap)) return;

  for (const v of snap.vendors) {
    const draft = snap.logisticsByVendor[v.vendorId];
    if (!draft) continue;
    if (draft.logisticsCreated) continue;
    if (isCvsCodShippingCodeEdge(v.shippingMethodCode)) continue;

    const stepDone = isVendorLogisticsStepComplete(
      draft,
      v.shippingMethodCode,
    );
    if (!stepDone) {
      console.warn(
        "[createPendingLogisticsForOrder] skip incomplete vendor",
        v.vendorId,
      );
      continue;
    }

    const res = await createLogisticsForVendor(
      admin,
      order,
      v.vendorId,
      serverReplyUrl,
    );
    if (!res.ok) {
      console.error(
        "[createPendingLogisticsForOrder]",
        v.vendorId,
        res.error,
      );
    }

    const { data: refreshed } = await admin
      .from("orders")
      .select("checkout_snapshot")
      .eq("id", order.id)
      .maybeSingle();
    if (refreshed) {
      order.checkout_snapshot = refreshed.checkout_snapshot;
    }
  }
}
