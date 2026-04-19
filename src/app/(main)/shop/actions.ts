'use server';

import { createClient } from '@/lib/supabase/server';

import { triggerRecalculateScores } from '@/lib/settings/trigger-recalculate-scores';

/** 進入商城時確保推薦分數已計算（依 Service Role 呼叫 Edge）。 */
export async function ensureShopScores(userId: string): Promise<void> {
  await triggerRecalculateScores(userId);
}

export async function startCheckout(payload: {
  mode: 'payment' | 'subscription';
  items: { variantId: string; qty: number }[];
  frequency?: string;
}): Promise<{ url?: string; error?: string }> {
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
    const res = await fetch(`${baseUrl}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) {
      return { error: data.error ?? `結帳建立失敗（${res.status}）` };
    }
    return { url: data.url };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : '無法連線建立結帳',
    };
  }
}

export async function subscriptionAction(payload: {
  subscriptionRowId: string;
  action: 'pause' | 'resume' | 'cancel' | 'update_frequency';
  frequency?: string;
}): Promise<{ ok?: boolean; error?: string }> {
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
    const res = await fetch(`${baseUrl}/functions/v1/manage-subscription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      return { error: data.error ?? `操作失敗（${res.status}）` };
    }
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : '無法連線',
    };
  }
}
