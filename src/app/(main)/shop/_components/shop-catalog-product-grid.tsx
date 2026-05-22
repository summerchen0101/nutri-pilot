'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { ShopQuickAddCartDialog } from '@/app/(main)/shop/_components/shop-quick-add-cart-dialog';
import { ShopCatalogProductCard } from '@/app/(main)/shop/shop-catalog-product-card';
import { toggleProductFavorite } from '@/app/(main)/shop/favorite-actions';
import type { ShopProductRow } from '@/app/(main)/shop/shop-home-client';
import { filterCatalogProducts } from '@/lib/shop/filter-catalog-products';
import { useShopCatalogUiStore } from '@/lib/shop/shop-catalog-ui-store';

interface ShopCatalogProductGridProps {
  initialProducts: ShopProductRow[];
  initialFavoriteProductIds: string[];
  dietMethod: string;
  usePersonalizedScores?: boolean;
  emptyMessage?: string;
}

export function ShopCatalogProductGrid({
  initialProducts,
  initialFavoriteProductIds,
  dietMethod,
  usePersonalizedScores = true,
  emptyMessage = '此條件下暫無商品，請調整篩選。',
}: ShopCatalogProductGridProps) {
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

  const filtered = useMemo(
    () =>
      filterCatalogProducts({
        products: initialProducts,
        category,
        filters,
        dietMethod,
        sortMode,
        catalogSearchQuery,
        usePersonalizedScores,
      }),
    [
      initialProducts,
      category,
      filters,
      dietMethod,
      sortMode,
      catalogSearchQuery,
      usePersonalizedScores,
    ],
  );

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
    <>
      <div className="grid grid-cols-2 items-stretch gap-3">
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
        <p className="mt-4 text-body text-muted-foreground">{emptyMessage}</p>
      : null}
      <ShopQuickAddCartDialog
        open={quickAddProduct != null}
        product={quickAddProduct}
        onClose={() => {
          setQuickAddProduct(null);
        }}
      />
    </>
  );
}
