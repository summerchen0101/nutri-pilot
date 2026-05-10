import { ShopCartHeaderAction } from '@/app/(main)/shop/shop-cart-header-action';
import { PageHeader } from '@/components/layout/page-header';

export function ShopPageHeader() {
  return (
    <PageHeader
      title="健康商城"
      spacing="compact"
      action={<ShopCartHeaderAction />}
    />
  );
}
