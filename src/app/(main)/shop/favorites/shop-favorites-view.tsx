'use client';

import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { ShopQuickAddCartDialog } from '@/app/(main)/shop/_components/shop-quick-add-cart-dialog';
import { ShopCatalogProductCard } from '@/app/(main)/shop/shop-catalog-product-card';
import { toggleProductFavorite } from '@/app/(main)/shop/favorite-actions';
import type { ShopProductRow } from '@/app/(main)/shop/shop-home-client';
import { SectionHeading } from '@/components/ui/section-heading';

interface Props {
  initialProducts: ShopProductRow[];
}

export function ShopFavoritesView({ initialProducts }: Props) {
  const router = useRouter();
  const [favoriteIds, setFavoriteIds] = useState(
    () => new Set(initialProducts.map((p) => p.id)),
  );
  const [quickAddProduct, setQuickAddProduct] = useState<ShopProductRow | null>(
    null,
  );
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(
    null,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    setFavoriteIds(new Set(initialProducts.map((p) => p.id)));
  }, [initialProducts]);

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
        if (!res.isFavorite) {
          router.refresh();
        }
      })();
    });
  }

  return (
    <section>
      <SectionHeading icon={Sparkles}>收藏的商品</SectionHeading>
      <div className="mt-3 grid grid-cols-2 gap-3 items-stretch">
        {initialProducts.map((p) => (
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

      <ShopQuickAddCartDialog
        open={quickAddProduct != null}
        product={quickAddProduct}
        onClose={() => {
          setQuickAddProduct(null);
        }}
      />
    </section>
  );
}
