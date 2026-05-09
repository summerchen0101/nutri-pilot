import Link from 'next/link';
import { FiShoppingCart } from 'react-icons/fi';

import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { PageHeader } from '@/components/layout/page-header';

export function ShopPageHeader() {
  return (
    <PageHeader
      title="健康商城"
      spacing="compact"
      action={
        <Link
          href="/shop/cart"
          aria-label="購物車"
          className={HEADER_ACTION_ICON_CLASS}
        >
          <FiShoppingCart className="h-[18px] w-[18px]" aria-hidden />
        </Link>
      }
    />
  );
}
