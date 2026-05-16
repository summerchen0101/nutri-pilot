import { ShopHeaderBrandTitle } from '@/app/(main)/shop/_components/shop-header-brand-title';
import { ShopCatalogSearchButton } from '@/app/(main)/shop/_components/shop-header-share-search';
import { ShopCartHeaderAction } from '@/app/(main)/shop/shop-cart-header-action';
import { ShopCatalogHeaderActions } from '@/app/(main)/shop/shop-catalog-header-actions';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';
import { cn } from '@/lib/utils/cn';

export function ShopPageHeader() {
  return (
    <StickyPageHeader
      anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
      title="健康商城"
      titleSlot={<ShopHeaderBrandTitle />}
      spacing="compact"
      action={
        <div
          className={cn(
            'hide-scrollbar flex max-w-[min(100%,72vw)] shrink-0 items-center justify-end gap-1.5 overflow-x-auto sm:max-w-none',
          )}
        >
          <ShopCatalogSearchButton />
          <ShopCatalogHeaderActions />
          <ShopCartHeaderAction />
        </div>
      }
    />
  );
}
