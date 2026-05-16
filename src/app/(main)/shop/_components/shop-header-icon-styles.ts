import { cn } from '@/lib/utils/cn';

/**
 * 商城頁首右側圖示：無邊框、無底色，維持 36×36 觸控區與 focus ring。
 */
export const SHOP_HEADER_ICON_BUTTON_CLASS = cn(
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
  'text-foreground transition-opacity',
  'hover:opacity-80 active:opacity-95',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
);

export const SHOP_HEADER_LEADING_ICON_CLASS = cn(
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
  'border-hairline border-border bg-secondary text-foreground',
  'transition-colors hover:bg-muted active:opacity-95',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
);
