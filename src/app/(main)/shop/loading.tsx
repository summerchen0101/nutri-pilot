import { ShopPageHeader } from '@/app/(main)/shop/shop-page-header';
import { ShopHomeSkeleton } from '@/app/(main)/shop/shop-home-skeleton';

export default function ShopLoading() {
  return (
    <div className="space-y-4" aria-busy aria-label="載入商城">
      <ShopPageHeader />
      <ShopHomeSkeleton />
    </div>
  );
}
