'use server';

import { createClient } from '@/lib/supabase/server';

import { triggerRecalculateScores } from '@/lib/settings/trigger-recalculate-scores';
import { isCheckoutSnapshotLike } from '@/lib/shop/build-remaining-logistics-queue';
import { canContinueOrderPayment } from '@/lib/shop/can-continue-order-payment';
import { resolveRequestAppOrigin } from '@/lib/shop/resolve-request-app-origin';
import { validateEcpayRecipientName } from '@/lib/shop/validate-ecpay-recipient-name';

/** 進入商城時確保推薦分數已計算（依 Service Role 呼叫 Edge）。 */
export async function ensureShopScores(userId: string): Promise<void> {
  await triggerRecalculateScores(userId);
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

export interface LogisticsQueueItem {
  vendorId: string;
  vendorName: string;
  logisticsType: 'CVS' | 'HOME';
  logisticsSubType: string;
}

export async function startCheckout(payload: {
  items: { variantId: string; qty: number }[];
  recipientName: string;
  recipientPhone: string;
  recipientAddressFull: string;
  saveShippingToProfile?: boolean;
  vendorShippingSelections?: Record<string, string>;
}): Promise<{
  orderId?: string;
  logisticsQueue?: LogisticsQueueItem[];
  error?: string;
}> {
  const nameErr = validateEcpayRecipientName(payload.recipientName);
  if (nameErr) {
    return { error: nameErr };
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    return { error: '請先登入' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    return { error: '環境設定缺少 NEXT_PUBLIC_SUPABASE_URL' };
  }

  try {
    const res = await fetch(`${baseUrl}/functions/v1/create-shop-order`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: payload.items,
        vendorShippingSelections: payload.vendorShippingSelections ?? {},
        recipientName: payload.recipientName,
        recipientPhone: payload.recipientPhone,
        recipientAddressFull: payload.recipientAddressFull,
        saveShippingToProfile: payload.saveShippingToProfile === true,
      }),
    });
    const data = (await res.json()) as {
      orderId?: string;
      logisticsQueue?: LogisticsQueueItem[];
      error?: string;
    };
    if (!res.ok) {
      return { error: data.error ?? `結帳建立失敗（${res.status}）` };
    }
    if (!data.orderId || !data.logisticsQueue) {
      return { error: '建單回傳缺少參數' };
    }
    return {
      orderId: data.orderId,
      logisticsQueue: data.logisticsQueue,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : '無法連線建立結帳',
    };
  }
}

export type EcpayCheckoutBridgeDebug = {
  merchantId: string;
  orderResultUrl: string;
  checkMacSelfOk: boolean;
};

export type EcpayBridgePayloadResult =
  | {
    ok: true;
    action: string;
    fields: Record<string, string>;
    debug?: EcpayCheckoutBridgeDebug;
  }
  | { ok: true; redirectUrl: string }
  | { ok: true; skipMap: true }
  | { ok: true; skipPayment: true; orderId: string }
  | { ok: false; error: string };

type EcpayBridgeEdgeBody = {
  action?: string;
  fields?: Record<string, string>;
  redirectUrl?: string;
  skipMap?: boolean;
  skipPayment?: boolean;
  orderId?: string;
  error?: string;
  debug?: EcpayCheckoutBridgeDebug;
};

function parseEcpayBridgeEdgeBody(text: string): EcpayBridgeEdgeBody | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith('<')) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as EcpayBridgeEdgeBody;
  } catch {
    return null;
  }
}

async function fetchEcpayBridgeFromEdge(
  functionName: string,
  params: Record<string, string>,
): Promise<EcpayBridgePayloadResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    return { ok: false, error: '請先登入' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    return { ok: false, error: '環境設定缺少 Supabase 變數' };
  }

  const url = new URL(`${baseUrl}/functions/v1/${functionName}`);
  url.search = new URLSearchParams({ ...params, format: 'json' }).toString();

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        apikey: anonKey,
      },
    });

    const contentType = res.headers.get('Content-Type') ?? '';
    const text = await res.text();
    const data = parseEcpayBridgeEdgeBody(text);

    if (data == null) {
      return {
        ok: false,
        error: contentType.includes('text/html') || text.trimStart().startsWith('<') ?
          `綠界服務回傳 HTML 而非 JSON（${res.status}），請確認 Edge 已部署最新版`
        : `綠界服務回傳非 JSON（${res.status}）`,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? `綠界請求失敗（${res.status}）`,
      };
    }

    if (typeof data.redirectUrl === 'string' && data.redirectUrl.length > 0) {
      return { ok: true, redirectUrl: data.redirectUrl };
    }

    if (data.skipMap === true) {
      return { ok: true, skipMap: true };
    }

    if (data.skipPayment === true && typeof data.orderId === 'string') {
      return { ok: true, skipPayment: true, orderId: data.orderId };
    }

    if (
      typeof data.action === 'string' &&
      data.action.length > 0 &&
      data.fields != null &&
      typeof data.fields === 'object' &&
      !Array.isArray(data.fields)
    ) {
      return {
        ok: true,
        action: data.action,
        fields: data.fields,
        ...(data.debug ? { debug: data.debug } : {}),
      };
    }

    return { ok: false, error: data.error ?? '綠界回應格式不正確' };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '無法取得綠界表單資料',
    };
  }
}

/** 伺服器端取物流選擇 form（避開瀏覽器 CORS） */
export async function fetchEcpayLogisticsSelectionPayload(payload: {
  orderId: string;
  vendorId: string;
}): Promise<EcpayBridgePayloadResult> {
  return fetchEcpayBridgeFromEdge('ecpay-logistics-selection', {
    orderId: payload.orderId,
    vendorId: payload.vendorId,
  });
}

/** 伺服器端取付款 form（避開瀏覽器 CORS） */
export async function fetchEcpayCheckoutPayload(payload: {
  orderId: string;
  /** 瀏覽器當前 origin；優先於 Server Action headers，避免 ngrok／本機 IP 與 OrderResultURL 不一致 */
  clientOrigin?: string;
}): Promise<EcpayBridgePayloadResult> {
  const clientOrigin = payload.clientOrigin?.trim().replace(/\/$/, '') ?? '';
  const appOrigin =
    clientOrigin && /^https?:\/\//i.test(clientOrigin) ?
      clientOrigin
    : await resolveRequestAppOrigin();
  return fetchEcpayBridgeFromEdge('ecpay-checkout', {
    orderId: payload.orderId,
    appOrigin,
  });
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
