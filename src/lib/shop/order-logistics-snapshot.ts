import { createClient } from '@/lib/supabase/client';

export interface OrderLogisticsDraftView {
  logisticsType: string | null;
  logisticsSubType: string | null;
  storeSelected: boolean;
  logisticsCreated: boolean;
  cvsStoreId: string | null;
  cvsStoreName: string | null;
  cvsStoreAddress: string | null;
  shippingAddress: string | null;
  completed: boolean;
}

export async function fetchOrderCheckoutVendorId(
  orderId: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('orders')
    .select('checkout_snapshot')
    .eq('id', orderId)
    .maybeSingle();

  const snap = data?.checkout_snapshot;
  if (snap == null || typeof snap !== 'object' || Array.isArray(snap)) {
    return null;
  }
  const vendors = (snap as Record<string, unknown>).vendors;
  if (!Array.isArray(vendors) || vendors.length === 0) return null;
  const first = vendors[0];
  if (first == null || typeof first !== 'object') return null;
  const vid = (first as Record<string, unknown>).vendorId;
  return typeof vid === 'string' ? vid : null;
}

export interface OrderCheckoutSummary {
  vendorId: string | null;
  paymentTotal: number;
  shippingMethodCode: string | null;
  status: string | null;
}

export async function fetchOrderCheckoutSummary(
  orderId: string,
): Promise<OrderCheckoutSummary | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('orders')
    .select('status, checkout_snapshot')
    .eq('id', orderId)
    .maybeSingle();

  if (!data) return null;

  const snap = data.checkout_snapshot;
  if (snap == null || typeof snap !== 'object' || Array.isArray(snap)) {
    return {
      vendorId: null,
      paymentTotal: 0,
      shippingMethodCode: null,
      status: data.status ?? null,
    };
  }

  const record = snap as Record<string, unknown>;
  const vendors = record.vendors;
  let vendorId: string | null = null;
  let shippingMethodCode: string | null = null;

  if (Array.isArray(vendors) && vendors.length > 0) {
    const first = vendors[0];
    if (first != null && typeof first === 'object') {
      const v = first as Record<string, unknown>;
      vendorId = typeof v.vendorId === 'string' ? v.vendorId : null;
      shippingMethodCode =
        typeof v.shippingMethodCode === 'string' ? v.shippingMethodCode : null;
    }
  }

  const paymentTotal =
    typeof record.paymentTotal === 'number' && Number.isFinite(record.paymentTotal) ?
      record.paymentTotal
    : 0;

  return {
    vendorId,
    paymentTotal,
    shippingMethodCode,
    status: data.status ?? null,
  };
}

export function readLogisticsCreateError(
  draft: unknown,
): string | null {
  if (draft == null || typeof draft !== 'object') return null;
  const meta = (draft as Record<string, unknown>).meta;
  if (meta == null || typeof meta !== 'object') return null;
  const createError = (meta as Record<string, unknown>).createError;
  if (typeof createError !== 'string') return null;
  const trimmed = createError.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function fetchOrderLogisticsDraft(
  orderId: string,
  vendorId: string,
): Promise<OrderLogisticsDraftView | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('orders')
    .select('checkout_snapshot')
    .eq('id', orderId)
    .maybeSingle();

  const snap = data?.checkout_snapshot;
  if (snap == null || typeof snap !== 'object' || Array.isArray(snap)) {
    return null;
  }

  const byVendor = (snap as Record<string, unknown>).logisticsByVendor;
  if (byVendor == null || typeof byVendor !== 'object') return null;

  const raw = (byVendor as Record<string, unknown>)[vendorId];
  if (raw == null || typeof raw !== 'object') return null;

  const d = raw as Record<string, unknown>;
  return {
    logisticsType: typeof d.logisticsType === 'string' ? d.logisticsType : null,
    logisticsSubType:
      typeof d.logisticsSubType === 'string' ? d.logisticsSubType : null,
    storeSelected: d.storeSelected === true,
    logisticsCreated: d.logisticsCreated === true,
    cvsStoreId:
      typeof d.cvsStoreId === 'string' ? d.cvsStoreId : null,
    cvsStoreName:
      typeof d.cvsStoreName === 'string' ? d.cvsStoreName : null,
    cvsStoreAddress:
      typeof d.cvsStoreAddress === 'string' ? d.cvsStoreAddress : null,
    shippingAddress:
      typeof d.shippingAddress === 'string' ? d.shippingAddress : null,
    completed: d.completed === true,
  };
}
