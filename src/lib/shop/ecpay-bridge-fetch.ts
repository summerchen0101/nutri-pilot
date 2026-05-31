import 'server-only';

import type { EcpayBridgePayloadResult } from '@/lib/shop/ecpay-bridge-types';
import { createClient } from '@/lib/supabase/server';
import { resolveRequestAppOrigin } from '@/lib/shop/resolve-request-app-origin';

type EcpayBridgeEdgeBody = {
  action?: string;
  fields?: Record<string, string>;
  redirectUrl?: string;
  skipMap?: boolean;
  skipPayment?: boolean;
  orderId?: string;
  error?: string;
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

async function getSessionAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function fetchEcpayBridgeFromEdge(
  functionName: string,
  params: Record<string, string>,
  accessTokenOverride?: string,
): Promise<EcpayBridgePayloadResult> {
  const token = accessTokenOverride?.trim() || (await getSessionAccessToken());
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

export async function fetchEcpayLogisticsSelectionBridge(
  payload: {
    orderId: string;
    vendorId: string;
    appOrigin?: string;
    nativeReturn?: boolean;
  },
  accessToken?: string,
): Promise<EcpayBridgePayloadResult> {
  const appOrigin = payload.appOrigin?.trim().replace(/\/$/, '') ?? '';
  return fetchEcpayBridgeFromEdge(
    'ecpay-logistics-selection',
    {
      orderId: payload.orderId,
      vendorId: payload.vendorId,
      ...(appOrigin ? { appOrigin } : {}),
      ...(payload.nativeReturn ? { nativeReturn: '1' } : {}),
    },
    accessToken,
  );
}

export async function fetchEcpayPaymentBridge(
  payload: {
    orderId: string;
    clientOrigin?: string;
    nativeReturn?: boolean;
  },
  accessToken?: string,
): Promise<EcpayBridgePayloadResult> {
  const clientOrigin = payload.clientOrigin?.trim().replace(/\/$/, '') ?? '';
  const appOrigin =
    clientOrigin && /^https?:\/\//i.test(clientOrigin) ?
      clientOrigin
    : await resolveRequestAppOrigin();
  return fetchEcpayBridgeFromEdge(
    'ecpay-checkout',
    {
      orderId: payload.orderId,
      appOrigin,
      ...(payload.nativeReturn ? { nativeReturn: '1' } : {}),
    },
    accessToken,
  );
}
