'use client';

import { Heart } from 'lucide-react';
import { useCallback, useEffect, useTransition } from 'react';

import { toggleProductFavorite } from '@/app/(main)/shop/favorite-actions';
import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { useShopActiveFavoriteStore } from '@/lib/shop/active-favorite-store';
import { cn } from '@/lib/utils/cn';

function useProductFavoriteToggle(
  productId: string,
  initialIsFavorite: boolean,
) {
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

  return { isFavorite, isPending, onToggle };
}

export function ProductFavoriteDetailBarButton({
  productId,
  initialIsFavorite,
}: ProductFavoriteHeaderButtonProps) {
  const { isFavorite, isPending, onToggle } = useProductFavoriteToggle(
    productId,
    initialIsFavorite,
  );

  return (
    <button
      type="button"
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? '取消我的最愛' : '加入我的最愛'}
      className="flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 py-1 text-micro text-muted-foreground transition-colors active:opacity-90"
      onClick={onToggle}
    >
      <Heart
        className={cn(
          'h-6 w-6 text-muted-foreground',
          isFavorite && 'fill-current text-primary',
        )}
        aria-hidden
      />
      <span>收藏</span>
    </button>
  );
}

interface ProductFavoriteHeaderButtonProps {
  productId: string;
  initialIsFavorite: boolean;
  /** 預設與全站／商城頁首無框圖示一致 */
  iconButtonClassName?: string;
}

export function ProductFavoriteHeaderButton({
  productId,
  initialIsFavorite,
  iconButtonClassName = HEADER_ACTION_ICON_CLASS,
}: ProductFavoriteHeaderButtonProps) {
  const { isFavorite, isPending, onToggle } = useProductFavoriteToggle(
    productId,
    initialIsFavorite,
  );

  return (
    <button
      type="button"
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? '取消我的最愛' : '加入我的最愛'}
      className={iconButtonClassName}
      onClick={onToggle}>
      <Heart
        className={cn('h-[18px] w-[18px]', isFavorite && 'fill-current')}
        aria-hidden
      />
    </button>
  );
}
