import { staffCan, type AdminRole } from '@/lib/admin';

/** 對齊 `orders.status` CHECK 與 docs/08-admin.md 營運流 */
export const ORDER_FLOW_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderFlowStatus = (typeof ORDER_FLOW_STATUSES)[number];

export function isOrderFlowStatus(status: string): status is OrderFlowStatus {
  return (ORDER_FLOW_STATUSES as readonly string[]).includes(status);
}

/** 下拉選項：不包含目前狀態（目前狀態單獨顯示） */
export function allowedNextOrderStatuses(
  role: AdminRole | null,
  current: string,
): OrderFlowStatus[] {
  if (!role || !isOrderFlowStatus(current)) return [];

  const next: Partial<Record<OrderFlowStatus, OrderFlowStatus[]>> = {
    pending: ['cancelled'],
    paid: ['shipped', 'delivered'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  let allowed = [...(next[current] ?? [])];

  if (current === 'paid' || current === 'shipped') {
    if (staffCan(role, 'order.refund')) {
      allowed.push('cancelled');
    }
  }

  allowed = uniqOrdered(allowed);
  const canShip =
    staffCan(role, 'order.ship');

  allowed = allowed.filter((s) =>
    passesPermissionFor(role, current, s, canShip));

  allowed.sort(sortStatusForDisplay);

  return allowed;
}

/** Server Action／表單驗證用 */
export function validateOrderTransition(
  role: AdminRole | null,
  current: string,
  next: string,
): { ok: true } | { ok: false; error: string } {
  if (!role) {
    return { ok: false, error: '沒有權限' };
  }
  if (!isOrderFlowStatus(current) || !isOrderFlowStatus(next)) {
    return { ok: false, error: '無效的訂單狀態' };
  }
  if (current === next) {
    return { ok: false, error: '請選擇與現況不同的狀態' };
  }

  const allowed = allowedNextOrderStatuses(role, current);
  if (!allowed.includes(next)) {
    return {
      ok: false,
      error: '無法將訂單從此刻狀態變更為所選值（請依金流出貨順序或由超管標記退款）',
    };
  }

  return { ok: true };
}

function passesPermissionFor(
  role: AdminRole | null,
  current: OrderFlowStatus,
  next: OrderFlowStatus,
  canShip: boolean,
): boolean {
  if (next === 'cancelled') {
    if (current === 'pending') return canShip;
    return role !== null && staffCan(role, 'order.refund');
  }
  return canShip && (next === 'shipped' || next === 'delivered');
}

function uniqOrdered(statuses: OrderFlowStatus[]): OrderFlowStatus[] {
  const seen = new Set<OrderFlowStatus>();
  const result: OrderFlowStatus[] = [];
  for (const s of statuses) {
    if (seen.has(s)) continue;
    seen.add(s);
    result.push(s);
  }
  return result;
}

function sortStatusForDisplay(a: OrderFlowStatus, b: OrderFlowStatus): number {
  return ORDER_FLOW_STATUSES.indexOf(a) - ORDER_FLOW_STATUSES.indexOf(b);
}
