import { ShopCartHeaderAction } from '@/app/(main)/shop/shop-cart-header-action';
import { ShopFavoritesHeaderLink } from '@/app/(main)/shop/shop-favorites-header-link';
import { PageHeader } from '@/components/layout/page-header';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';

export function ShopPageHeader() {
  return (
    <PageHeader
      anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
      title="健康商城"
      spacing="compact"
      action={
        <div className="flex shrink-0 items-center gap-2">
          <ShopFavoritesHeaderLink />
          <ShopCartHeaderAction />
        </div>
      }
    />
  );
}
