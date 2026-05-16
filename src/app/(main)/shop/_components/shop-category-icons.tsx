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

import type { ShopCategoryKey } from '@/lib/shop/constants';

export function ShopCategoryGlyph({
  category,
}: {
  category: ShopCategoryKey;
}) {
  if (category === 'all') {
    return <LayoutGrid className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'nuts') {
    return <Nut className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'protein_bar') {
    return <Package className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'supplement') {
    return <PillBottle className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'drink') {
    return <CupSoda className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  if (category === 'snack') {
    return <Cookie className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
  }
  return <UtensilsCrossed className="h-5 w-5" strokeWidth={1.8} aria-hidden />;
}
