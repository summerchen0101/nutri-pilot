import { cn } from '@/lib/utils/cn';

/** PageHeader 右上角 icon 連結／按鈕共用樣式（白底卡面、無粗線框） */
export const HEADER_ACTION_ICON_CLASS = cn(
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
  'bg-card text-primary transition-colors hover:bg-primary-light',
);
