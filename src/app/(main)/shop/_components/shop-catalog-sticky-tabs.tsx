"use client";

import { useShopCategories } from '@/app/(main)/shop/_components/shop-categories-context';
import { SHOP_ALL_CATEGORY, SHOP_UNDER_HEADER_STICKY_TOP_CLASS } from '@/lib/shop/constants';
import type { ShopCategoryKey } from '@/lib/shop/constants';
import { useShopCatalogUiStore } from "@/lib/shop/shop-catalog-ui-store";
import { cn } from "@/lib/utils/cn";

const ALL_LABEL = "全部";

const TAB_BUTTON_CLASS = cn(
  "shrink-0 whitespace-nowrap pb-2.5 pt-0.5 text-heading-section !font-normal",
  "text-foreground transition-[color,box-shadow]",
);

/** inset 底線避免 button border 與 overflow 裁切／層叠問題 */
const TAB_BUTTON_ACTIVE_CLASS = cn(
  "!font-medium text-primary shadow-[inset_0_-2px_0_0_var(--primary)]",
);

interface ShopCatalogStickyTabsProps {
  /**
   * `embedded`：與 `StickyPageHeaderShell` 內標題共用同一區 sticky；
   * `floating`：獨立 `sticky`（例：尚需與主頁首分段的場景）；
   * `bare`：僅分類列，由外層控制定位（例：廠商頁 scroll dock）。
   */
  variant?: "embedded" | "floating" | "bare";
}

export function ShopCatalogStickyTabs({
  variant = "floating",
}: ShopCatalogStickyTabsProps) {
  const category = useShopCatalogUiStore((s) => s.category);
  const setCategory = useShopCatalogUiStore((s) => s.setCategory);
  const { categoryKeys, labelBySlug } = useShopCategories();

  const tabList = (
    <div
      className="hide-scrollbar flex gap-4 overflow-x-auto border-b-hairline border-border/70 [-webkit-overflow-scrolling:touch]"
      role="tablist"
      aria-label="商品分類">
        {categoryKeys.map((key) => {
          const label =
            key === SHOP_ALL_CATEGORY ? ALL_LABEL : (labelBySlug[key] ?? key);
          const active = category === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                TAB_BUTTON_CLASS,
                active && TAB_BUTTON_ACTIVE_CLASS,
              )}
              onClick={() => {
                setCategory(key as ShopCategoryKey);
              }}>
              {label}
            </button>
          );
        })}
    </div>
  );

  if (variant === "bare") {
    return tabList;
  }

  return (
    <div
      className={cn(
        "-mx-4 border-border/70 px-4 pb-0 pt-2.5 backdrop-blur-md bg-background/90",
        variant === "embedded"
          ? "border-t-hairline"
          : cn("sticky z-40 mb-3", SHOP_UNDER_HEADER_STICKY_TOP_CLASS),
      )}>
      {tabList}
    </div>
  );
}
