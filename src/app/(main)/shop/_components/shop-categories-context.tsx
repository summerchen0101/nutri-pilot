'use client';

import { createContext, useContext, useMemo } from 'react';

import { SHOP_ALL_CATEGORY } from '@/lib/shop/constants';
import type { ShopCategoryRow } from '@/lib/shop/get-shop-categories';

type ShopCategoriesContextValue = {
  categories: ShopCategoryRow[];
  categoryKeys: string[];
  labelBySlug: Record<string, string>;
};

const ShopCategoriesContext = createContext<ShopCategoriesContextValue | null>(
  null,
);

export function ShopCategoriesProvider({
  categories,
  children,
}: Readonly<{
  categories: ShopCategoryRow[];
  children: React.ReactNode;
}>) {
  const value = useMemo(() => {
    const labelBySlug: Record<string, string> = {};
    for (const c of categories) {
      labelBySlug[c.slug] = c.label;
    }
    return {
      categories,
      categoryKeys: [SHOP_ALL_CATEGORY, ...categories.map((c) => c.slug)],
      labelBySlug,
    };
  }, [categories]);

  return (
    <ShopCategoriesContext.Provider value={value}>
      {children}
    </ShopCategoriesContext.Provider>
  );
}

export function useShopCategories(): ShopCategoriesContextValue {
  const ctx = useContext(ShopCategoriesContext);
  if (!ctx) {
    throw new Error('useShopCategories must be used within ShopCategoriesProvider');
  }
  return ctx;
}

export function useShopCategoryLabel(slug: string): string {
  const { labelBySlug } = useShopCategories();
  if (slug === SHOP_ALL_CATEGORY) {
    return '全部';
  }
  return labelBySlug[slug] ?? slug;
}
