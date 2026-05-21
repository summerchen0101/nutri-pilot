'use server';

import { revalidatePath } from 'next/cache';

import { validateOrderTransition } from '@/app/admin/orders/order-status-rules';
import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_TYPES,
} from '@/lib/admin/admin-audit-actions';
import { appendAdminAuditLog } from '@/lib/admin/append-admin-audit-log';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export async function updateOrderStatus(input: {
  orderId: string;
  status: string;
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();

  const { data: existing, error: readErr } = await supabase
    .from('orders')
    .select('status')
    .eq('id', input.orderId)
    .maybeSingle();

  if (readErr) {
    return { ok: false, error: readErr.message };
  }
  if (!existing?.status || typeof existing.status !== 'string') {
    return { ok: false, error: '找不到訂單' };
  }

  const validated = validateOrderTransition(
    role,
    existing.status,
    input.status,
  );
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  if (!staffCan(role, 'order.ship')) {
    return { ok: false, error: '沒有權限' };
  }

  if (
    input.status === 'cancelled'
    && existing.status !== 'pending'
    && !staffCan(role, 'order.refund')
  ) {
    return { ok: false, error: '沒有權限將已付款訂單標記為取消／退款後狀態' };
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: input.status })
    .eq('id', input.orderId)
    .eq('status', existing.status);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (input.status === 'shipped') {
    await supabase
      .from('sub_orders')
      .update({ status: 'shipped' })
      .eq('order_id', input.orderId)
      .eq('status', 'confirmed');
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.ORDER_STATUS_CHANGE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.ORDER,
    targetId: input.orderId,
    metadata: {
      from_status: existing.status,
      to_status: input.status,
      ...(input.status === 'cancelled'
        && existing.status !== 'pending'
        ? { reason: 'manual_refund_via_ecpay' as const }
        : {}),
    },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog order.status_change:', audit.error);
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${input.orderId}`);
  return { ok: true };
}

export async function queryEcpayTrade(input: {
  orderId: string;
}): Promise<
  | { ok: false; error: string }
  | { ok: true; data: unknown }
> {
  const role = await getAdminRole();
  if (!role || role !== 'super_admin') {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    return { ok: false, error: '請重新登入' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    return { ok: false, error: '環境設定缺少 NEXT_PUBLIC_SUPABASE_URL' };
  }

  try {
    const res = await fetch(`${baseUrl}/functions/v1/ecpay-query-trade`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId: input.orderId }),
    });
    const data = (await res.json()) as { error?: string; result?: unknown };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `查詢失敗（${res.status}）` };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '無法連線查詢',
    };
  }
}

export async function updateSubOrderLogistics(input: {
  orderId: string;
  subOrderId: string;
  trackingNumber: string;
  shippingCarrier: string;
  shippedAt: string;
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'order.ship')) {
    return { ok: false, error: '沒有權限' };
  }

  const tracking =
    input.trackingNumber.trim().length > 0 ?
      input.trackingNumber.trim().slice(0, 120)
    : null;
  const carrier =
    input.shippingCarrier.trim().length > 0 ?
      input.shippingCarrier.trim().slice(0, 80)
    : null;

  let shippedAt: string | null = null;
  const rawShipped = input.shippedAt.trim();
  if (rawShipped.length > 0) {
    const parsed = new Date(rawShipped);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: '出貨時間格式不正確' };
    }
    shippedAt = parsed.toISOString();
  }

  const supabase = createClient();

  const { data: sub, error: readErr } = await supabase
    .from('sub_orders')
    .select('id, order_id, tracking_number, shipping_carrier, shipped_at')
    .eq('id', input.subOrderId)
    .maybeSingle();

  if (readErr) {
    return { ok: false, error: readErr.message };
  }
  if (!sub || sub.order_id !== input.orderId) {
    return { ok: false, error: '找不到子訂單' };
  }

  const { error: updErr } = await supabase
    .from('sub_orders')
    .update({
      tracking_number: tracking,
      shipping_carrier: carrier,
      shipped_at: shippedAt,
    })
    .eq('id', input.subOrderId);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.SUB_ORDER_LOGISTICS_UPDATE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.SUB_ORDER,
    targetId: input.subOrderId,
    metadata: {
      order_id: input.orderId,
      before: {
        tracking_number: sub.tracking_number,
        shipping_carrier: sub.shipping_carrier,
        shipped_at: sub.shipped_at,
      },
      after: {
        tracking_number: tracking,
        shipping_carrier: carrier,
        shipped_at: shippedAt,
      },
    },
  });
  if (!audit.ok) {
    console.error(
      'appendAdminAuditLog sub_order.logistics_update:',
      audit.error,
    );
  }

  revalidatePath(`/admin/orders/${input.orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true };
}

export type EcpayLogisticsPrintPayloadResult =
  | { ok: true; action: string; fields: Record<string, string> }
  | { ok: false; error: string };

type EcpayPrintEdgeBody = {
  action?: string;
  fields?: Record<string, string>;
  error?: string;
};

function parseEcpayPrintEdgeBody(text: string): EcpayPrintEdgeBody | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith('<')) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as EcpayPrintEdgeBody;
  } catch {
    return null;
  }
}

/** 伺服器端取托運單列印 form（避開 Supabase 託管 HTML sandbox） */
export async function fetchEcpayLogisticsPrintPayload(payload: {
  subOrderId: string;
}): Promise<EcpayLogisticsPrintPayloadResult> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'order.ship')) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    return { ok: false, error: '請重新登入' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    return { ok: false, error: '環境設定缺少 Supabase 變數' };
  }

  const url = new URL(`${baseUrl}/functions/v1/ecpay-logistics-print`);
  url.search = new URLSearchParams({
    subOrderId: payload.subOrderId,
    format: 'json',
  }).toString();

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
    const data = parseEcpayPrintEdgeBody(text);

    if (data == null) {
      return {
        ok: false,
        error:
          contentType.includes('text/html') || text.trimStart().startsWith('<') ?
            `綠界列印服務回傳 HTML 而非 JSON（${res.status}），請確認 Edge 已部署最新版`
          : `綠界列印服務回傳非 JSON（${res.status}）`,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? `列印請求失敗（${res.status}）`,
      };
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
      error: e instanceof Error ? e.message : '無法取得列印表單資料',
    };
  }
}
