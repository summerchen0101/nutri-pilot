'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { resolveVendorShopHref } from '@/app/(main)/shop/actions';

/** 舊版 `/shop?vendor_id=…` 導向廠商獨立頁；結帳返回時略過。 */
export function ShopCatalogScopeSync() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('checkout') === '1') return;

    const vendorId = searchParams.get('vendor_id')?.trim() ?? '';
    if (!vendorId) return;

    let cancelled = false;

    void (async () => {
      const href = await resolveVendorShopHref(vendorId);
      if (cancelled || !href) return;
      router.replace(href);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return null;
}
