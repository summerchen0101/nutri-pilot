import Link from 'next/link';
import { Heart } from 'lucide-react';

import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';

export function ShopFavoritesHeaderLink() {
  return (
    <Link
      href="/shop/favorites"
      aria-label="我的最愛"
      className={HEADER_ACTION_ICON_CLASS}
    >
      <Heart className="h-[18px] w-[18px]" aria-hidden />
    </Link>
  );
}
