'use client';

import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useTransition } from 'react';

import { toggleProductFavorite } from '@/app/(main)/shop/favorite-actions';
import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { useShopActiveFavoriteStore } from '@/lib/shop/active-favorite-store';
import { cn } from '@/lib/utils/cn';

const FAB_BUTTON_CLASS = cn(
  'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary',
  'text-[var(--color-background-primary)] transition-opacity duration-150',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C]',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background-primary)]',
  'active:opacity-95',
);

/** 商城首頁浮動愛心：無單一商品可切換時，導向「我的最愛」列表。 */
export function ShopFavoritesListFabLink() {
  return (
    <Link
      href="/shop/favorites"
      aria-label="我的最愛"
      className={FAB_BUTTON_CLASS}
    >
      <Heart className="h-[22px] w-[22px]" aria-hidden />
    </Link>
  );
}

interface ProductFavoriteHeaderButtonProps {
  productId: string;
  initialIsFavorite: boolean;
}

export function ProductFavoriteHeaderButton({
  productId,
  initialIsFavorite,
}: ProductFavoriteHeaderButtonProps) {
  const setActiveFavorite = useShopActiveFavoriteStore(
    (s) => s.setActiveFavorite,
  );

  useEffect(() => {
    setActiveFavorite(productId, initialIsFavorite);
    return () => {
      setActiveFavorite(null, false);
    };
  }, [productId, initialIsFavorite, setActiveFavorite]);

  const isFavorite = useShopActiveFavoriteStore((s) => {
    if (s.productId === productId) return s.isFavorite;
    return initialIsFavorite;
  });
  const applyToggledFavorite = useShopActiveFavoriteStore(
    (s) => s.applyToggledFavorite,
  );
  const [isPending, startTransition] = useTransition();

  const onToggle = useCallback(() => {
    const state = useShopActiveFavoriteStore.getState();
    const prev =
      state.productId === productId ? state.isFavorite : initialIsFavorite;
    const optimistic = !prev;
    applyToggledFavorite(productId, optimistic);

    startTransition(() => {
      void (async () => {
        const res = await toggleProductFavorite(productId);
        if (!res.ok) {
          applyToggledFavorite(productId, prev);
          window.alert(res.error ?? '操作失敗');
          return;
        }
        applyToggledFavorite(productId, res.isFavorite);
      })();
    });
  }, [applyToggledFavorite, productId, initialIsFavorite]);

  return (
    <button
      type="button"
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? '取消我的最愛' : '加入我的最愛'}
      className={HEADER_ACTION_ICON_CLASS}
      onClick={onToggle}>
      <Heart
        className={cn('h-[18px] w-[18px]', isFavorite && 'fill-current')}
        aria-hidden
      />
    </button>
  );
}

export function ProductFavoriteFabButton({
  productId,
}: {
  productId: string;
}) {
  const isFavorite = useShopActiveFavoriteStore((s) => {
    if (s.productId === productId) return s.isFavorite;
    return false;
  });
  const applyToggledFavorite = useShopActiveFavoriteStore(
    (s) => s.applyToggledFavorite,
  );
  const [isPending, startTransition] = useTransition();

  const onToggle = useCallback(() => {
    const state = useShopActiveFavoriteStore.getState();
    const prev = state.productId === productId ? state.isFavorite : false;
    const optimistic = !prev;
    applyToggledFavorite(productId, optimistic);

    startTransition(() => {
      void (async () => {
        const res = await toggleProductFavorite(productId);
        if (!res.ok) {
          applyToggledFavorite(productId, prev);
          window.alert(res.error ?? '操作失敗');
          return;
        }
        applyToggledFavorite(productId, res.isFavorite);
      })();
    });
  }, [applyToggledFavorite, productId]);

  return (
    <button
      type="button"
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? '取消我的最愛' : '加入我的最愛'}
      className={FAB_BUTTON_CLASS}
      onClick={onToggle}>
      <Heart
        className={cn('h-[22px] w-[22px]', isFavorite && 'fill-current')}
        aria-hidden
      />
    </button>
  );
}
