'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ShopCategoryGlyph } from '@/app/(main)/shop/_components/shop-category-icons';
import { ShopRightSheet } from '@/app/(main)/shop/_components/shop-right-sheet';
import { Button } from '@/components/ui/button';
import {
  SHOP_CATEGORY_KEYS,
  SHOP_CATEGORY_LABEL,
  type ShopCategoryKey,
} from '@/lib/shop/constants';
import {
  type ShopCatalogSortMode,
  useShopCatalogUiStore,
} from '@/lib/shop/shop-catalog-ui-store';
import { cn } from '@/lib/utils/cn';

const FILTER_ROWS: Array<{ key: string; label: string }> = [
  { key: 'matches_diet', label: '符合計畫飲食法' },
  { key: 'high_protein', label: '高蛋白（≥15g）' },
  { key: 'low_sugar', label: '低糖（≤5g）' },
  { key: 'organic', label: '有機認證' },
];

const SORT_OPTIONS: Array<{
  mode: ShopCatalogSortMode;
  label: string;
  disabledWhenNoPersonalized?: boolean;
}> = [
  {
    mode: 'personalized',
    label: '個人化推薦',
    disabledWhenNoPersonalized: true,
  },
  { mode: 'rating', label: '評分最高' },
  { mode: 'price_asc', label: '價格：低到高' },
  { mode: 'price_desc', label: '價格：高到低' },
];

function ToggleRow({
  pressed,
  label,
  onToggle,
}: {
  pressed: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-[10px] border-hairline border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary/40"
    >
      <span className="text-body text-foreground">{label}</span>
      <span
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-[1.5px] border-solid transition-colors',
          pressed ?
            'border-primary bg-primary'
          : 'border-transparent bg-[var(--color-border-tertiary)]',
        )}
      >
        <span
          className={cn(
            'pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition-transform duration-200 ease-out',
            pressed ? 'translate-x-[22px]' : 'translate-x-0',
          )}
          aria-hidden
        />
      </span>
    </button>
  );
}

function SortOptionRow({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-[10px] border-hairline px-3 py-2.5 text-left text-body transition-colors',
        disabled ?
          'cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
        : selected ?
          'border-primary bg-primary-light text-[#2D6B4A]'
        : 'border-border bg-card text-foreground hover:border-primary/40',
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-solid',
          selected && !disabled ? 'border-primary bg-primary' : 'border-border bg-background',
        )}
        aria-hidden
      >
        {selected && !disabled ?
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        : null}
      </span>
      {label}
    </button>
  );
}

function CategoryPanelBody(): ReactNode {
  const category = useShopCatalogUiStore((s) => s.category);
  const setCategory = useShopCatalogUiStore((s) => s.setCategory);
  const closeCategoryPanel = useShopCatalogUiStore((s) => s.closeCategoryPanel);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      {SHOP_CATEGORY_KEYS.map((key: ShopCategoryKey) => {
        const selected = category === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              setCategory(key);
              closeCategoryPanel();
            }}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
              selected ?
                'bg-primary text-white'
              : 'border-hairline border-transparent bg-card text-foreground hover:border-primary/40',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                selected ? 'bg-white/15 text-white' : 'bg-secondary text-foreground',
              )}
            >
              <ShopCategoryGlyph category={key} />
            </span>
            <span className="text-body font-medium">
              {key === 'all' ? '全部' : SHOP_CATEGORY_LABEL[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FilterPanelBody(): ReactNode {
  const filters = useShopCatalogUiStore((s) => s.filters);
  const toggleFilter = useShopCatalogUiStore((s) => s.toggleFilter);
  const sortMode = useShopCatalogUiStore((s) => s.sortMode);
  const setSortMode = useShopCatalogUiStore((s) => s.setSortMode);
  const clearFiltersAndSort = useShopCatalogUiStore((s) => s.clearFiltersAndSort);
  const closeFilterPanel = useShopCatalogUiStore((s) => s.closeFilterPanel);
  const personalizedScoresEnabled = useShopCatalogUiStore(
    (s) => s.personalizedScoresEnabled,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-2 pb-4">
        <section className="space-y-2">
          <h3 className="text-heading-card text-foreground">商品條件</h3>
          <div className="flex flex-col gap-2">
            {FILTER_ROWS.map(({ key, label }) => (
              <ToggleRow
                key={key}
                label={label}
                pressed={filters.includes(key)}
                onToggle={() => toggleFilter(key)}
              />
            ))}
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="text-heading-card text-foreground">排序</h3>
          {personalizedScoresEnabled === false ?
            <p className="text-caption text-muted-foreground">
              已關閉個人化推薦排序，改以評分與價格選項為主。
            </p>
          : null}
          <div className="flex flex-col gap-2">
            {SORT_OPTIONS.map(({ mode, label, disabledWhenNoPersonalized }) => {
              const disabled =
                Boolean(disabledWhenNoPersonalized) &&
                personalizedScoresEnabled === false;
              return (
                <SortOptionRow
                  key={mode}
                  label={label}
                  selected={sortMode === mode}
                  disabled={disabled}
                  onSelect={() => {
                    if (!disabled) setSortMode(mode);
                  }}
                />
              );
            })}
          </div>
        </section>
      </div>
      <div className="flex shrink-0 gap-2 border-t-hairline border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="outline"
          size="default"
          className="flex-1"
          onClick={() => {
            clearFiltersAndSort();
          }}
        >
          清除篩選
        </Button>
        <Button
          type="button"
          variant="default"
          size="default"
          className="flex-1"
          onClick={() => closeFilterPanel()}
        >
          完成
        </Button>
      </div>
    </div>
  );
}

export function ShopCatalogPanels(): ReactNode {
  const categoryPanelOpen = useShopCatalogUiStore((s) => s.categoryPanelOpen);
  const filterPanelOpen = useShopCatalogUiStore((s) => s.filterPanelOpen);
  const closeCategoryPanel = useShopCatalogUiStore((s) => s.closeCategoryPanel);
  const closeFilterPanel = useShopCatalogUiStore((s) => s.closeFilterPanel);

  const node = (
    <>
      <ShopRightSheet
        open={categoryPanelOpen}
        onClose={closeCategoryPanel}
        title="商品分類"
      >
        <CategoryPanelBody />
      </ShopRightSheet>
      <ShopRightSheet
        open={filterPanelOpen}
        onClose={closeFilterPanel}
        title="篩選與排序"
      >
        <FilterPanelBody />
      </ShopRightSheet>
    </>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
