'use client';

import {
  Cookie,
  CupSoda,
  LayoutGrid,
  Nut,
  Package,
  PillBottle,
  UtensilsCrossed,
} from 'lucide-react';

import { useShopCategories } from '@/app/(main)/shop/_components/shop-categories-context';
import { SHOP_ALL_CATEGORY, type ShopCategoryKey } from '@/lib/shop/constants';
import type { ShopCategoryIconKey } from '@/lib/shop/shop-category-icon-keys';
import { isShopCategoryIconKey } from '@/lib/shop/shop-category-icon-keys';

function iconForKey(iconKey: ShopCategoryIconKey | null | undefined) {
  if (iconKey === 'nuts') {
    return <Nut className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (iconKey === 'protein_bar') {
    return <Package className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (iconKey === 'supplement') {
    return <PillBottle className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (iconKey === 'drink') {
    return <CupSoda className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (iconKey === 'snack') {
    return <Cookie className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (iconKey === 'meal_replacement') {
    return <UtensilsCrossed className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  return <Package className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
}

export function ShopCategoryGlyph({
  category,
}: {
  category: ShopCategoryKey;
}) {
  const { categories } = useShopCategories();

  if (category === SHOP_ALL_CATEGORY) {
    return <LayoutGrid className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }

  const row = categories.find((c) => c.slug === category);
  const key =
    row?.icon_key && isShopCategoryIconKey(row.icon_key) ?
      row.icon_key
    : isShopCategoryIconKey(category) ?
      category
    : 'default';

  return iconForKey(key);
}
