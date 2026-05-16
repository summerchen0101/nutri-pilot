import Link from 'next/link';
import { Heart } from 'lucide-react';

import { SHOP_HEADER_ICON_BUTTON_CLASS } from '@/app/(main)/shop/_components/shop-header-icon-styles';

export function ShopFavoritesHeaderLink() {
  return (
    <Link
      href="/shop/favorites"
      aria-label="我的最愛"
      className={SHOP_HEADER_ICON_BUTTON_CLASS}
    >
      <Heart className="h-[18px] w-[18px]" aria-hidden />
    </Link>
  );
}
