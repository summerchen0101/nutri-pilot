'use client';

import { FiShoppingCart } from 'react-icons/fi';

import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { useCartStore } from '@/lib/shop/cart-store';

export function ShopCartHeaderAction() {
  const openCartPanel = useCartStore((s) => s.openCartPanel);

  return (
    <button
      type="button"
      aria-label="購物車"
      className={HEADER_ACTION_ICON_CLASS}
      onClick={() => openCartPanel()}
    >
      <FiShoppingCart className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
