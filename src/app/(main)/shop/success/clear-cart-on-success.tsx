'use client';

import { useEffect } from 'react';

import { useCartStore } from '@/lib/shop/cart-store';

/** 付款完成回到成功頁後清空購物車（訂單已於藍新流程建立） */
export function ClearCartOnSuccess() {
  const clear = useCartStore((s) => s.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
