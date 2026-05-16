'use client';

import { ListFilter } from 'lucide-react';

import { SHOP_HEADER_ICON_BUTTON_CLASS } from '@/app/(main)/shop/_components/shop-header-icon-styles';
import {
  catalogActiveRefinementCount,
  useShopCatalogUiStore,
} from '@/lib/shop/shop-catalog-ui-store';
import { cn } from '@/lib/utils/cn';

/** 列表頁頁首：僅篩選（分類改由底部選單開啟） */
export function ShopCatalogHeaderActions() {
  const filters = useShopCatalogUiStore((s) => s.filters);
  const sortMode = useShopCatalogUiStore((s) => s.sortMode);
  const openFilterPanel = useShopCatalogUiStore((s) => s.openFilterPanel);

  const badgeCount = catalogActiveRefinementCount({ filters, sortMode });

  return (
    <button
      type="button"
      aria-label="篩選"
      className={cn(SHOP_HEADER_ICON_BUTTON_CLASS, 'relative')}
      onClick={() => openFilterPanel()}
    >
      <ListFilter className="h-[18px] w-[18px]" aria-hidden />
      {badgeCount > 0 ?
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E24B4A] px-[5px] text-micro font-medium leading-none text-white">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      : null}
    </button>
  );
}
