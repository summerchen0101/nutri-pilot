'use client';

import {
  SHOP_CATEGORY_KEYS,
  SHOP_CATEGORY_LABEL,
  SHOP_UNDER_HEADER_STICKY_TOP_CLASS,
} from '@/lib/shop/constants';
import type { ShopCategoryKey } from '@/lib/shop/constants';
import { useShopCatalogUiStore } from '@/lib/shop/shop-catalog-ui-store';
import { cn } from '@/lib/utils/cn';

const ALL_LABEL = '全部';

const TAB_BUTTON_CLASS = cn(
  'shrink-0 whitespace-nowrap pb-2.5 pt-0.5 text-heading-section !font-normal',
  'text-foreground transition-[color,box-shadow]',
);

/** inset 底線避免 button border 與 overflow 裁切／層叠問題 */
const TAB_BUTTON_ACTIVE_CLASS = cn(
  '!font-medium text-primary shadow-[inset_0_-2px_0_0_var(--primary)]',
);

interface ShopCatalogStickyTabsProps {
  /**
   * `embedded`：與 `StickyPageHeaderShell` 內標題共用同一區 sticky；
   * `floating`：獨立 `sticky`（例：尚需與主頁首分段的場景）。
   */
  variant?: 'embedded' | 'floating';
}

export function ShopCatalogStickyTabs({
  variant = 'floating',
}: ShopCatalogStickyTabsProps) {
  const category = useShopCatalogUiStore((s) => s.category);
  const setCategory = useShopCatalogUiStore((s) => s.setCategory);

  return (
    <div
      className={cn(
        '-mx-4 border-border/70 px-4 pb-0 pt-2.5 backdrop-blur-md bg-background/90',
        variant === 'embedded' ?
          'border-t-hairline'
        : cn(
            'sticky z-40 mb-3',
            SHOP_UNDER_HEADER_STICKY_TOP_CLASS,
          ),
      )}
    >
      <div
        className="hide-scrollbar flex gap-4 overflow-x-auto border-b-hairline border-border/70 [-webkit-overflow-scrolling:touch]"
        role="tablist"
        aria-label="商品分類"
      >
        {SHOP_CATEGORY_KEYS.map((key) => {
          const label =
            key === 'all' ? ALL_LABEL : SHOP_CATEGORY_LABEL[key];
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
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
