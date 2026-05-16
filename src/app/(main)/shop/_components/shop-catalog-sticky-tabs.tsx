'use client';

import {
  SHOP_CATEGORY_KEYS,
  SHOP_CATEGORY_LABEL,
} from '@/lib/shop/constants';
import type { ShopCategoryKey } from '@/lib/shop/constants';
import { useShopCatalogUiStore } from '@/lib/shop/shop-catalog-ui-store';
import { cn } from '@/lib/utils/cn';

const ALL_LABEL = '全部';

export function ShopCatalogStickyTabs() {
  const category = useShopCatalogUiStore((s) => s.category);
  const setCategory = useShopCatalogUiStore((s) => s.setCategory);

  return (
    <div
      className={cn(
        'sticky z-40 -mx-4 mb-3 border-b-hairline border-border/70',
        'bg-background/90 px-4 py-2.5 backdrop-blur-md',
        /** 與全站 sticky header 疊放：頁首約一行 + safe area */
        'top-[calc(env(safe-area-inset-top)+3.25rem)]',
      )}
    >
      <div
        className="hide-scrollbar flex gap-4 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]"
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
                'relative shrink-0 whitespace-nowrap pb-2 text-body text-muted-foreground transition-colors',
                active && 'font-medium text-foreground',
              )}
              onClick={() => {
                setCategory(key as ShopCategoryKey);
              }}
            >
              {label}
              {active ?
                <span
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--steel-accent)]"
                  aria-hidden
                />
              : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
