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

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.ORDER_STATUS_CHANGE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.ORDER,
    targetId: input.orderId,
    metadata: {
      from_status: existing.status,
      to_status: input.status,
    },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog order.status_change:', audit.error);
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${input.orderId}`);
  return { ok: true };
}
