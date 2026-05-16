import { SHOP_BRAND_WORDMARK } from '@/lib/shop/shop-header-constants';
import { cn } from '@/lib/utils/cn';

interface Props {
  className?: string;
}

/** 商城列表頁頂部中央襯線字標（MARAIS 風） */
export function ShopHeaderBrandTitle({ className }: Props) {
  return (
    <p
      className={cn(
        'font-serif text-heading-screen font-medium uppercase tracking-[0.14em] text-foreground',
        className,
      )}
    >
      {SHOP_BRAND_WORDMARK}
    </p>
  );
}
