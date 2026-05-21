'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useCartStore } from '@/lib/shop/cart-store';
import { fetchOrderCheckoutVendorId } from '@/lib/shop/order-logistics-snapshot';

/** 付款／物流完成後僅移除已結帳廠商品項（URL vendor_id 或訂單快照，不依賴未 persist 的 memory） */
export function ClearCartOnSuccess() {
  const searchParams = useSearchParams();
  const clearedRef = useRef(false);
  const lastCheckedOutVendorId = useCartStore((s) => s.lastCheckedOutVendorId);
  const removeLinesByVendor = useCartStore((s) => s.removeLinesByVendor);
  const setLastCheckedOutVendorId = useCartStore(
    (s) => s.setLastCheckedOutVendorId,
  );

  useEffect(() => {
    if (clearedRef.current) return;

    const clearVendor = (vendorId: string) => {
      const vid = vendorId.trim();
      if (!vid || clearedRef.current) return;
      clearedRef.current = true;
      removeLinesByVendor(vid);
      setLastCheckedOutVendorId(null);
    };

    const urlVendorId = searchParams.get('vendor_id')?.trim() ?? '';
    if (urlVendorId) {
      clearVendor(urlVendorId);
      return;
    }

    if (lastCheckedOutVendorId) {
      clearVendor(lastCheckedOutVendorId);
      return;
    }

    const orderId =
      searchParams.get('order_id')?.trim() ??
      searchParams.get('orderId')?.trim() ??
      '';
    if (!orderId) return;

    let cancelled = false;
    void (async () => {
      const vendorId = await fetchOrderCheckoutVendorId(orderId);
      if (cancelled || !vendorId) return;
      clearVendor(vendorId);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    lastCheckedOutVendorId,
    removeLinesByVendor,
    setLastCheckedOutVendorId,
  ]);

  return null;
}
