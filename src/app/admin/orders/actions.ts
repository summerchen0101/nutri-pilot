'use server';

import { revalidatePath } from 'next/cache';

import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;

export async function updateOrderStatus(input: {
  orderId: string;
  status: (typeof ORDER_STATUSES)[number];
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'order.ship')) {
    return { ok: false, error: '沒有權限' };
  }

  if (!ORDER_STATUSES.includes(input.status)) {
    return { ok: false, error: '無效的訂單狀態' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('orders')
    .update({ status: input.status })
    .eq('id', input.orderId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${input.orderId}`);
  return { ok: true };
}
