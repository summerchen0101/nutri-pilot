'use client';

import { LayoutGrid, ListFilter } from 'lucide-react';

import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import {
  catalogActiveRefinementCount,
  useShopCatalogUiStore,
} from '@/lib/shop/shop-catalog-ui-store';
import { cn } from '@/lib/utils/cn';

export function ShopCatalogHeaderActions() {
  const filters = useShopCatalogUiStore((s) => s.filters);
  const sortMode = useShopCatalogUiStore((s) => s.sortMode);
  const openCategoryPanel = useShopCatalogUiStore((s) => s.openCategoryPanel);
  const openFilterPanel = useShopCatalogUiStore((s) => s.openFilterPanel);

  const badgeCount = catalogActiveRefinementCount({ filters, sortMode });

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label="商品分類"
        className={HEADER_ACTION_ICON_CLASS}
        onClick={() => openCategoryPanel()}
      >
        <LayoutGrid className="h-[18px] w-[18px]" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="篩選"
        className={cn(HEADER_ACTION_ICON_CLASS, 'relative')}
        onClick={() => openFilterPanel()}
      >
        <ListFilter className="h-[18px] w-[18px]" aria-hidden />
        {badgeCount > 0 ?
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E24B4A] px-[5px] text-micro font-medium leading-none text-white">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        : null}
      </button>
    </div>
  );
}
