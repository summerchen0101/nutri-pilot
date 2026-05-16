'use client';

import {
  ShopHeaderShareButton,
} from '@/app/(main)/shop/_components/shop-header-share-search';
import { ShopCartHeaderAction } from '@/app/(main)/shop/shop-cart-header-action';
import { cn } from '@/lib/utils/cn';

interface Props {
  productName: string;
}

export function ShopProductDetailHeaderActions({ productName }: Props) {
  return (
    <div
      className={cn(
        'hide-scrollbar flex max-w-[min(100%,calc(100vw-8rem))] shrink-0 items-center justify-end gap-1.5 overflow-x-auto',
      )}
    >
      <ShopHeaderShareButton shareTitle={productName} />
      <ShopCartHeaderAction />
    </div>
  );
}
