'use server';

import { revalidatePath } from 'next/cache';

import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_TYPES,
} from '@/lib/admin/admin-audit-actions';
import { appendAdminAuditLog } from '@/lib/admin/append-admin-audit-log';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRpcResult(raw: Json): { ok: boolean; error?: string; balance_after?: number } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'rpc_invalid_response' };
  }
  const o = raw as Record<string, Json>;
  const ok = o.ok === true;
  const error = typeof o.error === 'string' ? o.error : undefined;
  const balanceAfter =
    typeof o.balance_after === 'number' ? o.balance_after : undefined;
  return { ok, error, balance_after: balanceAfter };
}

export async function adjustUserShopPoints(input: {
  userId: string;
  delta: number;
  note: string;
  grantExpiresAt: string;
}): Promise<{ ok: false; error: string } | { ok: true; balanceAfter: number }> {
  const role = await getAdminRole();
  if (!staffCan(role, 'shop.points.adjust')) {
    return { ok: false, error: '沒有權限' };
  }

  const uid = input.userId.trim();
  if (!UUID_RE.test(uid)) {
    return { ok: false, error: 'user_id 須為 UUID' };
  }

  const delta = Math.trunc(input.delta);
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: '異動點數須為非零整數' };
  }

  let grantExpiresAt: string | null = null;
  const rawExp = input.grantExpiresAt.trim();
  if (rawExp.length > 0) {
    const d = new Date(rawExp);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: '到期時間格式不正確' };
    }
    grantExpiresAt = d.toISOString();
  }

  const supabase = createClient();
  const { data: raw, error } = await supabase.rpc('admin_adjust_shop_points', {
    p_user_id: uid,
    p_delta: delta,
    p_note: input.note.trim().slice(0, 500),
    p_grant_expires_at: grantExpiresAt,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const parsed = asRpcResult(raw);
  if (!parsed.ok) {
    const msg =
      parsed.error === 'forbidden' ? '沒有權限'
      : parsed.error === 'user_not_found' ? '找不到使用者'
      : parsed.error === 'insufficient_balance' ? '餘額不足'
      : parsed.error === 'insufficient_lot_inventory' ? '可扣抵批次不足（含效期）'
      : parsed.error === 'invalid_delta' ? '點數異動無效'
      : (parsed.error ?? '調整失敗');
    return { ok: false, error: msg };
  }

  const balanceAfter = parsed.balance_after;
  if (typeof balanceAfter !== 'number') {
    return { ok: false, error: '回傳資料異常' };
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.SHOP_POINTS_ADJUST,
    targetType: ADMIN_AUDIT_TARGET_TYPES.USER,
    targetId: uid,
    metadata: {
      delta,
      balance_after: balanceAfter,
      grant_expires_at: grantExpiresAt,
    },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog shop_points.adjust:', audit.error);
  }

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${uid}`);
  revalidatePath('/admin/shop-points');
  return { ok: true, balanceAfter };
}
