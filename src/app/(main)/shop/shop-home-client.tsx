'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Sparkles, Store } from 'lucide-react';

import { ShopCatalogStickyTabs } from '@/app/(main)/shop/_components/shop-catalog-sticky-tabs';
import { ShopQuickAddCartDialog } from '@/app/(main)/shop/_components/shop-quick-add-cart-dialog';
import { ShopCatalogProductCard } from '@/app/(main)/shop/shop-catalog-product-card';
import { toggleProductFavorite } from '@/app/(main)/shop/favorite-actions';
import { SectionHeading } from '@/components/ui/section-heading';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import {
  type ShopCatalogSortMode,
  useShopCatalogUiStore,
} from '@/lib/shop/shop-catalog-ui-store';

export interface ShopProductRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category: string;
  calories: number;
  protein_g: number;
  sugar_g: number | null;
  diet_tags: string[] | null;
  cert_tags: string[] | null;
  avg_rating: number | null;
  score: number;
  brand: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    vendor: {
      id: string;
      name: string;
      shipping_fee: number;
      free_shipping_threshold: number | null;
      lead_time_days: number;
    };
  } | null;
  variants: Array<{
    id: string;
    label: string;
    price: number;
    stock: number | null;
  }>;
}

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  productCount: number;
}

interface Props {
  initialProducts: ShopProductRow[];
  initialFavoriteProductIds: string[];
  brands: BrandRow[];
  dietMethod: string;
  usePersonalizedScores?: boolean;
}

function minVariantPrice(
  variants: ShopProductRow['variants'],
): number | null {
  if (variants.length === 0) return null;
  return Math.min(...variants.map((v) => v.price));
}

function compareCatalogProducts(
  a: ShopProductRow,
  b: ShopProductRow,
  effectiveSort: ShopCatalogSortMode,
  usePersonalizedScores: boolean,
): number {
  switch (effectiveSort) {
    case 'personalized': {
      if (usePersonalizedScores) {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
      }
      return Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0);
    }
    case 'rating': {
      return Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0);
    }
    case 'price_asc': {
      const pa = minVariantPrice(a.variants);
      const pb = minVariantPrice(b.variants);
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    }
    case 'price_desc': {
      const pa = minVariantPrice(a.variants);
      const pb = minVariantPrice(b.variants);
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      if (pa !== pb) return pb - pa;
      return a.name.localeCompare(b.name);
    }
    default: {
      return 0;
    }
  }
}

export function ShopHomeClient({
  initialProducts,
  initialFavoriteProductIds,
  brands,
  dietMethod,
  usePersonalizedScores = true,
}: Props) {
  const category = useShopCatalogUiStore((s) => s.category);
  const filters = useShopCatalogUiStore((s) => s.filters);
  const sortMode = useShopCatalogUiStore((s) => s.sortMode);
  const catalogSearchQuery = useShopCatalogUiStore((s) => s.catalogSearchQuery);
  const setPersonalizedScoresEnabled = useShopCatalogUiStore(
    (s) => s.setPersonalizedScoresEnabled,
  );

  const [favoriteIds, setFavoriteIds] = useState(
    () => new Set(initialFavoriteProductIds),
  );
  const [quickAddProduct, setQuickAddProduct] = useState<ShopProductRow | null>(
    null,
  );
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(
    null,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    setFavoriteIds(new Set(initialFavoriteProductIds));
  }, [initialFavoriteProductIds]);

  useEffect(() => {
    setPersonalizedScoresEnabled(usePersonalizedScores);
  }, [usePersonalizedScores, setPersonalizedScoresEnabled]);

  const filtered = useMemo(() => {
    let list = initialProducts.filter(
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
      !usePersonalizedScores && sortMode === 'personalized' ?
        'rating'
      : sortMode;

    list.sort((a, b) =>
      compareCatalogProducts(a, b, effectiveSort, usePersonalizedScores),
    );

    return list;
  }, [
    initialProducts,
    category,
    filters,
    dietMethod,
    usePersonalizedScores,
    sortMode,
    catalogSearchQuery,
  ]);

  function handleToggleFavorite(productId: string) {
    const was = favoriteIds.has(productId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (was) next.delete(productId);
      else next.add(productId);
      return next;
    });
    setPendingFavoriteId(productId);
    startTransition(() => {
      void (async () => {
        const res = await toggleProductFavorite(productId);
        setPendingFavoriteId((cur) => (cur === productId ? null : cur));
        if (!res.ok) {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (was) next.add(productId);
            else next.delete(productId);
            return next;
          });
          window.alert(res.error ?? '操作失敗');
          return;
        }
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (res.isFavorite) next.add(productId);
          else next.delete(productId);
          return next;
        });
      })();
    });
  }

  return (
    <div className="space-y-5">
      <ShopCatalogStickyTabs />
      <section>
        <SectionHeading icon={Sparkles}>為你推薦</SectionHeading>
        {!usePersonalizedScores ?
          <p className="mt-1 text-caption text-muted-foreground">
            個人化排序已關閉，將依篩選側欄所選方式排序。
          </p>
        : null}
        <div className="mt-3 grid grid-cols-2 gap-3 items-stretch">
          {filtered.map((p) => (
            <ShopCatalogProductCard
              key={p.id}
              product={p}
              isFavorite={favoriteIds.has(p.id)}
              isFavoritePending={pendingFavoriteId === p.id}
              onToggleFavorite={() => {
                handleToggleFavorite(p.id);
              }}
              onQuickAdd={() => {
                setQuickAddProduct(p);
              }}
            />
          ))}
        </div>
        {filtered.length === 0 ?
          <p className="mt-4 text-body text-muted-foreground">
            此條件下暫無商品，請調整篩選。
          </p>
        : null}
      </section>

      <ShopQuickAddCartDialog
        open={quickAddProduct != null}
        product={quickAddProduct}
        onClose={() => {
          setQuickAddProduct(null);
        }}
      />

      <section>
        <SectionHeading icon={Store}>精選品牌</SectionHeading>
        <div className="hide-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {brands
            .filter((b) => b.productCount > 0)
            .map((b) => (
              <div
                key={b.id}
                className="min-w-[140px] shrink-0 rounded-xl bg-card p-3"
              >
                <p className="text-body font-medium text-foreground">
                  {b.name}
                </p>
                <p className="mt-1 text-caption tabular-nums text-muted-foreground">
                  {formatShopGroupedInteger(b.productCount)} 件商品
                </p>
                <Link
                  href="/shop"
                  className="mt-2 inline-block text-caption font-medium text-primary"
                >
                  查看商城
                </Link>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
