"use client";

import { FiShoppingCart } from "react-icons/fi";

import { SHOP_HEADER_ICON_BUTTON_CLASS } from "@/app/(main)/shop/_components/shop-header-icon-styles";
import { useCartStore } from "@/lib/shop/cart-store";
import { cn } from "@/lib/utils/cn";

function cartTotalQty(lines: { qty: number }[]) {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

export function ShopCartHeaderAction() {
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const totalQty = useCartStore((s) => cartTotalQty(s.lines));

  return (
    <button
      type="button"
      aria-label="購物車"
      className={cn(SHOP_HEADER_ICON_BUTTON_CLASS, "relative")}
      onClick={() => openCartPanel()}>
      <FiShoppingCart className="h-[18px] w-[18px]" aria-hidden />
      {totalQty > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E24B4A] px-[5px] text-micro font-medium leading-none text-white">
          {totalQty > 99 ? "99+" : totalQty}
        </span>
      ) : null}
    </button>
  );
}
