import { ShopCartHeaderAction } from '@/app/(main)/shop/shop-cart-header-action';
import { PageHeader } from '@/components/layout/page-header';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';

export function ShopPageHeader() {
  return (
    <PageHeader
      anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
      title="健康商城"
      spacing="compact"
      action={<ShopCartHeaderAction />}
    />
  );
}
