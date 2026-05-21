'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

let cachedBalance: number | null = null;
let inflight: Promise<number> | null = null;

async function fetchShopPointsBalance(): Promise<number> {
  if (inflight) return inflight;

  inflight = (async () => {
    const supabase = createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      cachedBalance = 0;
      return 0;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('shop_points_balance')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error(error.message);
      cachedBalance = 0;
      return 0;
    }

    const balance = Math.max(
      0,
      Math.floor(Number(data?.shop_points_balance ?? 0)),
    );
    cachedBalance = balance;
    return balance;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** 讀取購物點餘額；模組級 cache 避免購物車多處重複查詢。 */
export function useShopPointsBalance() {
  const [balance, setBalance] = useState(cachedBalance ?? 0);
  const [loading, setLoading] = useState(cachedBalance == null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (cachedBalance != null) {
        setBalance(cachedBalance);
        setLoading(false);
        return;
      }

      setLoading(true);
      const next = await fetchShopPointsBalance();
      if (!cancelled) {
        setBalance(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { balance, loading };
}

/** 建單成功後刷新餘額（例如點數折抵扣點後）。 */
export function invalidateShopPointsBalanceCache() {
  cachedBalance = null;
}

export async function refreshShopPointsBalance(): Promise<number> {
  cachedBalance = null;
  return fetchShopPointsBalance();
}
