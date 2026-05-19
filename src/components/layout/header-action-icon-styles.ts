import { cn } from "@/lib/utils/cn";

/**
 * StickyPageHeader 左／右圖示按鈕：與商城一致 — 無邊框、無底色、foreground 圖示、透明度 hover。
 */
export const PAGE_HEADER_ICON_BUTTON_CLASS = cn(
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
  "text-foreground transition-opacity",
  "hover:opacity-80 active:opacity-95",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1",
);

/** {@link PAGE_HEADER_ICON_BUTTON_CLASS} */
export const HEADER_LEADING_ICON_CLASS = PAGE_HEADER_ICON_BUTTON_CLASS;

/** {@link PAGE_HEADER_ICON_BUTTON_CLASS} */
export const HEADER_ACTION_ICON_CLASS = PAGE_HEADER_ICON_BUTTON_CLASS;

/**
 * 區塊標題列右側 icon（例：卡片內 SectionHeading 旁）— 仍用主色以與內文區塊互動區隔。
 */
export const SECTION_HEADING_ACTION_ICON_CLASS = cn(
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
  "text-primary transition-colors hover:bg-muted/60",
);
