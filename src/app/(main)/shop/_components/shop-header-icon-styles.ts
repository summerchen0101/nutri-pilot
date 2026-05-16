import { cn } from '@/lib/utils/cn';

/**
 * MARAIS 風：淺底、細邊框、中性圖示（非全站 HEADER_ACTION_ICON_CLASS 主色框）
 */
export const SHOP_HEADER_ICON_BUTTON_CLASS = cn(
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
  'border-hairline border-border bg-secondary text-foreground',
  'transition-colors hover:bg-muted active:opacity-95',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
);

export const SHOP_HEADER_LEADING_ICON_CLASS = cn(
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
  'border-hairline border-border bg-secondary text-foreground',
  'transition-colors hover:bg-muted active:opacity-95',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
);
