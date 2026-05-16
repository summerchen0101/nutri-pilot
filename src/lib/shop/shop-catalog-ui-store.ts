'use client';

import { create } from 'zustand';

import type { ShopCategoryKey } from '@/lib/shop/constants';

export type ShopCatalogSortMode =
  | 'personalized'
  | 'rating'
  | 'price_asc'
  | 'price_desc';

export const DEFAULT_SHOP_CATALOG_SORT: ShopCatalogSortMode = 'personalized';

interface ShopCatalogUiState {
  category: ShopCategoryKey;
  filters: string[];
  sortMode: ShopCatalogSortMode;
  /** Suspense 載入前為 null；由 ShopHomeClient 注入 */
  personalizedScoresEnabled: boolean | null;
  categoryPanelOpen: boolean;
  filterPanelOpen: boolean;
  setCategory: (category: ShopCategoryKey) => void;
  toggleFilter: (key: string) => void;
  clearFiltersAndSort: () => void;
  setSortMode: (mode: ShopCatalogSortMode) => void;
  setPersonalizedScoresEnabled: (enabled: boolean) => void;
  openCategoryPanel: () => void;
  closeCategoryPanel: () => void;
  openFilterPanel: () => void;
  closeFilterPanel: () => void;
}

export function catalogActiveRefinementCount(state: {
  filters: string[];
  sortMode: ShopCatalogSortMode;
}): number {
  const sortExtra =
    state.sortMode === DEFAULT_SHOP_CATALOG_SORT ? 0 : 1;
  return state.filters.length + sortExtra;
}

export const useShopCatalogUiStore = create<ShopCatalogUiState>((set) => ({
  category: 'all',
  filters: [],
  sortMode: DEFAULT_SHOP_CATALOG_SORT,
  personalizedScoresEnabled: null,
  categoryPanelOpen: false,
  filterPanelOpen: false,
  setCategory: (category) => set({ category }),
  toggleFilter: (key) =>
    set((s) => ({
      filters: s.filters.includes(key) ?
        s.filters.filter((k) => k !== key)
      : [...s.filters, key],
    })),
  clearFiltersAndSort: () =>
    set((s) => ({
      filters: [],
      sortMode:
        s.personalizedScoresEnabled === false ?
          'rating'
        : DEFAULT_SHOP_CATALOG_SORT,
    })),
  setSortMode: (sortMode) => set({ sortMode }),
  setPersonalizedScoresEnabled: (enabled) =>
    set((s) => ({
      personalizedScoresEnabled: enabled,
      sortMode:
        !enabled && s.sortMode === 'personalized' ? 'rating' : s.sortMode,
    })),
  openCategoryPanel: () =>
    set({ categoryPanelOpen: true, filterPanelOpen: false }),
  closeCategoryPanel: () => set({ categoryPanelOpen: false }),
  openFilterPanel: () =>
    set({ filterPanelOpen: true, categoryPanelOpen: false }),
  closeFilterPanel: () => set({ filterPanelOpen: false }),
}));
