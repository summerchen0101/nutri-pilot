import { cn } from '@/lib/utils/cn';

const HEADER_ICON_LAYOUT_CLASS = cn(
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
  'transition-colors',
);

/** PageHeader 左上角返回等 leading icon（與右側區隔，不加主色框線） */
export const HEADER_LEADING_ICON_CLASS = cn(
  HEADER_ICON_LAYOUT_CLASS,
  'bg-card text-primary hover:bg-primary hover:text-white',
);

/** PageHeader 右上角 icon：透明底 + 主色框線（docs/09-ui-design 主色強調 1.5px），hover 填主色 */
export const HEADER_ACTION_ICON_CLASS = cn(
  HEADER_ICON_LAYOUT_CLASS,
  'bg-transparent text-primary',
  'border-[1.5px] border-solid border-primary',
  'hover:bg-primary hover:text-white',
);

/**
 * 區塊標題列右側 icon（例：卡片內 SectionHeading 旁）— 無框、無白底，與 PageHeader 右上角區隔。
 */
export const SECTION_HEADING_ACTION_ICON_CLASS = cn(
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
  'text-primary transition-colors hover:bg-muted/60',
);
