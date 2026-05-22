import { compareByAdminSortOrder } from '@/lib/shop/compare-product-display-order';
import type { ShopProductRow } from '@/app/(main)/shop/shop-home-client';
import type { ShopCatalogSortMode } from '@/lib/shop/shop-catalog-ui-store';

function minVariantPrice(
  variants: ShopProductRow['variants'],
): number | null {
  if (variants.length === 0) return null;
  return Math.min(...variants.map((v) => v.price));
}

function withAdminSortTiebreaker(
  primary: number,
  a: ShopProductRow,
  b: ShopProductRow,
): number {
  if (primary !== 0) return primary;
  return compareByAdminSortOrder(a, b);
}

export function compareCatalogProducts(
  a: ShopProductRow,
  b: ShopProductRow,
  effectiveSort: ShopCatalogSortMode,
): number {
  switch (effectiveSort) {
    case 'personalized': {
      return compareByAdminSortOrder(a, b);
    }
    case 'rating': {
      return withAdminSortTiebreaker(
        Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0),
        a,
        b,
      );
    }
    case 'price_asc': {
      const pa = minVariantPrice(a.variants);
      const pb = minVariantPrice(b.variants);
      if (pa == null && pb == null) return compareByAdminSortOrder(a, b);
      if (pa == null) return 1;
      if (pb == null) return -1;
      return withAdminSortTiebreaker(pa - pb, a, b);
    }
    case 'price_desc': {
      const pa = minVariantPrice(a.variants);
      const pb = minVariantPrice(b.variants);
      if (pa == null && pb == null) return compareByAdminSortOrder(a, b);
      if (pa == null) return 1;
      if (pb == null) return -1;
      return withAdminSortTiebreaker(pb - pa, a, b);
    }
    default: {
      return compareByAdminSortOrder(a, b);
    }
  }
}

export interface FilterCatalogProductsInput {
  products: ShopProductRow[];
  category: string;
  filters: string[];
  dietMethod: string;
  sortMode: ShopCatalogSortMode;
  catalogSearchQuery: string;
  usePersonalizedScores: boolean;
}

export function filterCatalogProducts({
  products,
  category,
  filters,
  dietMethod,
  sortMode,
  catalogSearchQuery,
  usePersonalizedScores,
}: FilterCatalogProductsInput): ShopProductRow[] {
  let list = products.filter(
    (p) => p.brand != null && p.brand.vendor != null,
  );

  if (category !== 'all') {
    list = list.filter((p) => p.category === category);
  }

  if (filters.includes('matches_diet')) {
    list = list.filter((p) => (p.diet_tags ?? []).includes(dietMethod));
  }
  if (filters.includes('high_protein')) {
    list = list.filter((p) => Number(p.protein_g) >= 15);
  }
  if (filters.includes('low_sugar')) {
    list = list.filter((p) => Number(p.sugar_g ?? 0) <= 5);
  }
  if (filters.includes('organic')) {
    list = list.filter((p) => (p.cert_tags ?? []).includes('organic'));
  }

  const q = catalogSearchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }

  const effectiveSort: ShopCatalogSortMode =
    !usePersonalizedScores && sortMode === 'personalized' ? 'rating' : sortMode;

  list.sort((a, b) => compareCatalogProducts(a, b, effectiveSort));

  return list;
}
