'use server';

import { createClient } from '@/lib/supabase/server';

import { triggerRecalculateScores } from '@/lib/settings/trigger-recalculate-scores';

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

export async function startCheckout(payload: {
  items: { variantId: string; qty: number }[];
  recipientName: string;
  recipientPhone: string;
  recipientAddressFull: string;
  saveShippingToProfile?: boolean;
  /** vendor_id → vendor_shipping_methods.id */
  vendorShippingSelections?: Record<string, string>;
}): Promise<{
  paymentUrl?: string;
  formFields?: Record<string, string>;
  error?: string;
}> {
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
    const res = await fetch(`${baseUrl}/functions/v1/create-newebpay-payment`, {
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
      paymentUrl?: string;
      formFields?: Record<string, string>;
      error?: string;
    };
    if (!res.ok) {
      return { error: data.error ?? `結帳建立失敗（${res.status}）` };
    }
    if (!data.paymentUrl || !data.formFields) {
      return { error: '金流回傳缺少參數' };
    }
    return { paymentUrl: data.paymentUrl, formFields: data.formFields };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : '無法連線建立結帳',
    };
  }
}
