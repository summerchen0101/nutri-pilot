'use server';

import { createClient } from '@/lib/supabase/server';

import { triggerRecalculateScores } from '@/lib/settings/trigger-recalculate-scores';
import { isCheckoutSnapshotLike } from '@/lib/shop/build-remaining-logistics-queue';
import { canContinueOrderPayment } from '@/lib/shop/can-continue-order-payment';
import {
  fetchEcpayLogisticsSelectionBridge,
  fetchEcpayPaymentBridge,
} from '@/lib/shop/ecpay-bridge-fetch';
import type { EcpayBridgePayloadResult } from '@/lib/shop/ecpay-bridge-types';
import { validateEcpayRecipientName } from '@/lib/shop/validate-ecpay-recipient-name';

/** 進入商城時確保推薦分數已計算（依 Service Role 呼叫 Edge）。 */
export async function ensureShopScores(userId: string): Promise<void> {
  await triggerRecalculateScores(userId);
}

/** 舊版 `/shop?vendor_id=` 導向廠商頁 slug 路徑 */
export async function resolveVendorShopHref(
  vendorId: string,
): Promise<string | null> {
  const id = vendorId.trim();
  if (!id) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('vendors')
    .select('slug')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data?.slug) return null;
  return `/shop/vendors/${encodeURIComponent(data.slug)}`;
}

export type GetCheckoutShippingDefaultsResult =
  | {
      ok: true;
      defaultRecipientName: string;
      defaultPhone: string;
      defaultAddressFull: string;
    }
  | { ok: false; reason: 'unauthenticated' | 'needs_onboarding' };

/**
 * 結帳側欄開啟時載入收件預設值（與原 `/shop/checkout` 頁面查詢一致）。
 */
export async function getCheckoutShippingDefaults(): Promise<GetCheckoutShippingDefaultsResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: 'unauthenticated' };
  }

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('diet_method, shipping_recipient_name, shipping_phone, shipping_address_full')
    .eq('user_id', user.id)
    .single();

  if (profileErr || !profile?.diet_method) {
    return { ok: false, reason: 'needs_onboarding' };
  }

  const { data: defaultAddr } = await supabase
    .from('user_shipping_addresses')
    .select('recipient_name, phone, address_full')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  return {
    ok: true,
    defaultRecipientName:
      defaultAddr?.recipient_name ??
      (profile.shipping_recipient_name as string | null) ??
      '',
    defaultPhone:
      defaultAddr?.phone ?? (profile.shipping_phone as string | null) ?? '',
    defaultAddressFull:
      defaultAddr?.address_full ??
      (profile.shipping_address_full as string | null) ??
      '',
  };
}

export type StartCheckoutResult =
  | {
      ok: true;
      orderId: string;
      vendorId: string;
      shippingMethodCode: string | null;
      paymentTotal: number;
    }
  | { ok: false; error: string };

export async function startCheckout(payload: {
  checkoutVendorId: string;
  items: { variantId: string; qty: number }[];
  recipientName: string;
  recipientPhone: string;
  recipientAddressFull: string;
  saveShippingToProfile?: boolean;
  vendorShippingSelections?: Record<string, string>;
  homeLogisticsSubType?: 'TCAT' | 'POST';
  applyShopPoints?: boolean;
}): Promise<StartCheckoutResult> {
  const vendorId = payload.checkoutVendorId?.trim() ?? '';
  if (!vendorId) {
    return { ok: false, error: '請先選擇要結帳的廠商' };
  }

  const nameErr = validateEcpayRecipientName(payload.recipientName);
  if (nameErr) {
    return { ok: false, error: nameErr };
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    return { ok: false, error: '請先登入' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    return { ok: false, error: '環境設定缺少 NEXT_PUBLIC_SUPABASE_URL' };
  }

  try {
    const res = await fetch(`${baseUrl}/functions/v1/create-shop-order`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkoutVendorId: vendorId,
        items: payload.items,
        vendorShippingSelections: payload.vendorShippingSelections ?? {},
        recipientName: payload.recipientName,
        recipientPhone: payload.recipientPhone,
        recipientAddressFull: payload.recipientAddressFull,
        saveShippingToProfile: payload.saveShippingToProfile === true,
        homeLogisticsSubType: payload.homeLogisticsSubType,
        applyShopPoints: payload.applyShopPoints === true,
      }),
    });
    const data = (await res.json()) as {
      orderId?: string;
      vendorId?: string;
      shippingMethodCode?: string | null;
      paymentTotal?: number;
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `結帳建立失敗（${res.status}）` };
    }
    if (!data.orderId) {
      return { ok: false, error: '建單回傳缺少 orderId' };
    }
    return {
      ok: true,
      orderId: data.orderId,
      vendorId: data.vendorId ?? vendorId,
      shippingMethodCode: data.shippingMethodCode ?? null,
      paymentTotal:
        typeof data.paymentTotal === 'number' ? data.paymentTotal : 0,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '無法連線建立結帳',
    };
  }
}

export type SyncCheckoutOrderPointsResult =
  | {
      ok: true;
      paymentTotal: number;
      netOrderTotal: number;
      pointsRedeemed: number;
    }
  | { ok: false; error: string };

/** 付款前同步 pending 訂單點數折抵（補正建單時 cart 尚未 rehydrate 的情況） */
export async function syncCheckoutOrderPoints(payload: {
  orderId: string;
  applyShopPoints?: boolean;
}): Promise<SyncCheckoutOrderPointsResult> {
  const orderId = payload.orderId?.trim() ?? '';
  if (!orderId) {
    return { ok: false, error: '缺少 orderId' };
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    return { ok: false, error: '請先登入' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    return { ok: false, error: '環境設定缺少 NEXT_PUBLIC_SUPABASE_URL' };
  }

  try {
    const res = await fetch(`${baseUrl}/functions/v1/sync-shop-order-checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        applyShopPoints: payload.applyShopPoints === true,
      }),
    });
    const data = (await res.json()) as {
      paymentTotal?: number;
      netOrderTotal?: number;
      pointsRedeemed?: number;
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `同步失敗（${res.status}）` };
    }
    if (typeof data.paymentTotal !== 'number') {
      return { ok: false, error: '同步回傳缺少 paymentTotal' };
    }
    return {
      ok: true,
      paymentTotal: data.paymentTotal,
      netOrderTotal:
        typeof data.netOrderTotal === 'number' ? data.netOrderTotal : data.paymentTotal,
      pointsRedeemed:
        typeof data.pointsRedeemed === 'number' ? data.pointsRedeemed : 0,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '無法連線同步結帳金額',
    };
  }
}

export async function updateCheckoutOrderShipping(payload: {
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddressFull: string;
  saveShippingToProfile?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const nameErr = validateEcpayRecipientName(payload.recipientName);
  if (nameErr) {
    return { ok: false, error: nameErr };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: '請先登入' };
  }

  const { error } = await supabase
    .from('orders')
    .update({
      recipient_name: payload.recipientName.trim(),
      recipient_phone: payload.recipientPhone.trim(),
      recipient_address_full: payload.recipientAddressFull.trim() || null,
    })
    .eq('id', payload.orderId)
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (error) {
    return { ok: false, error: error.message };
  }

  if (payload.saveShippingToProfile) {
    await supabase
      .from('user_profiles')
      .update({
        shipping_recipient_name: payload.recipientName.trim(),
        shipping_phone: payload.recipientPhone.trim(),
        shipping_address_full: payload.recipientAddressFull.trim() || null,
      })
      .eq('user_id', user.id);
  }

  return { ok: true };
}

export async function markHomeLogisticsForCheckout(payload: {
  orderId: string;
  vendorId: string;
  homeLogisticsSubType: 'TCAT' | 'POST';
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return { ok: false, error: '請先登入' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    return { ok: false, error: '環境設定缺少 NEXT_PUBLIC_SUPABASE_URL' };
  }

  try {
    const res = await fetch(`${baseUrl}/functions/v1/ecpay-mark-home-logistics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: payload.orderId,
        vendorId: payload.vendorId,
        homeLogisticsSubType: payload.homeLogisticsSubType,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `宅配設定失敗（${res.status}）` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '無法連線宅配設定',
    };
  }
}

export type { EcpayBridgePayloadResult, EcpayCheckoutBridgeDebug } from '@/lib/shop/ecpay-bridge-types';

/** 伺服器端取物流選擇 form（避開瀏覽器 CORS） */
export async function fetchEcpayLogisticsSelectionPayload(payload: {
  orderId: string;
  vendorId: string;
  clientOrigin?: string;
}): Promise<EcpayBridgePayloadResult> {
  return fetchEcpayLogisticsSelectionBridge({
    orderId: payload.orderId,
    vendorId: payload.vendorId,
    appOrigin: payload.clientOrigin,
  });
}

/** 伺服器端取付款 form（避開瀏覽器 CORS） */
export async function fetchEcpayCheckoutPayload(payload: {
  orderId: string;
  /** 瀏覽器當前 origin；優先於 Server Action headers，避免 ngrok／本機 IP 與 OrderResultURL 不一致 */
  clientOrigin?: string;
}): Promise<EcpayBridgePayloadResult> {
  return fetchEcpayPaymentBridge(payload);
}

export type AssertOrderPayableResult =
  | { ok: true }
  | { ok: false; error: string };

/** 待付款訂單是否可開啟綠界付款（物流須已完成） */
export async function assertOrderPayable(
  orderId: string,
): Promise<AssertOrderPayableResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: '請先登入' };
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('status, checkout_snapshot')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !order) {
    return { ok: false, error: '找不到訂單' };
  }

  if (!canContinueOrderPayment(order.status, order.checkout_snapshot)) {
    if (order.status !== 'pending') {
      return { ok: false, error: '此訂單非待付款狀態' };
    }
    if (!isCheckoutSnapshotLike(order.checkout_snapshot)) {
      return { ok: false, error: '訂單資料異常' };
    }
    return { ok: false, error: '請先於結帳流程完成物流設定' };
  }

  return { ok: true };
}
