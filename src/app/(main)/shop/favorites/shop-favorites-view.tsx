'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { toggleProductFavorite } from '@/app/(main)/shop/favorite-actions';
import type { ShopProductRow } from '@/app/(main)/shop/shop-home-client';
import { SectionHeading } from '@/components/ui/section-heading';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import { cn } from '@/lib/utils/cn';

const FAVORITE_REMOVE_BUTTON_CLASS = cn(
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]',
  'text-primary transition-opacity',
  'hover:opacity-80 active:opacity-95 disabled:opacity-50',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1',
);

interface Props {
  initialProducts: ShopProductRow[];
}

function FavoriteRemoveButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className={FAVORITE_REMOVE_BUTTON_CLASS}
      aria-label="取消我的最愛"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(() => {
          void (async () => {
            const res = await toggleProductFavorite(productId);
            if (!res.ok) {
              window.alert(res.error ?? '操作失敗');
              return;
            }
            router.refresh();
          })();
        });
      }}
    >
      <Heart
        className="h-[18px] w-[18px] fill-current text-primary"
        aria-hidden
      />
    </button>
  );
}

export function ShopFavoritesView({ initialProducts }: Props) {
  return (
    <section>
      <SectionHeading icon={Sparkles}>收藏的商品</SectionHeading>
      <div className="mt-3 grid grid-cols-2 gap-3 items-stretch">
        {initialProducts.map((p) => {
          const minPrice = Math.min(
            ...p.variants.map((v) => Number(v.price)),
          );
          const detailHref = `/shop/${p.id}`;
          return (
            <div
              key={p.id}
              className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-hairline border-transparent bg-card transition-colors hover:border-primary/50"
            >
              <Link
                href={detailHref}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
                  {p.image_url ?
                    <Image
                      src={p.image_url}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover"
                      unoptimized
                    />
                  : null}
                  {p.score > 0 ?
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-white tabular-nums">
                      推薦 {formatShopGroupedInteger(p.score)}
                    </span>
                  : null}
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-3 pb-2">
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {p.brand?.name ?? ''}
                  </p>
                </div>
              </Link>
              <div className="flex items-center justify-between gap-2 px-3 pb-3">
                <Link
                  href={detailHref}
                  className="min-w-0 flex-1 text-[13px] font-medium tabular-nums text-foreground"
                >
                  NT$ {formatShopGroupedInteger(minPrice)}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {' '}
                    起
                  </span>
                </Link>
                <FavoriteRemoveButton productId={p.id} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
