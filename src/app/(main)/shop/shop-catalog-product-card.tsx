"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";

import type { ShopProductRow } from "@/app/(main)/shop/shop-home-client";
import { catalogListStrikePrice } from "@/lib/shop/catalog-card-price";
import { SHOP_CATEGORY_LABEL } from "@/lib/shop/constants";
import { formatShopGroupedInteger } from "@/lib/shop/format-shop-number";
import { cn } from "@/lib/utils/cn";

const ICON_ACTION_CLASS = cn(
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md p-0",
  "text-foreground transition-opacity hover:opacity-80",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:pointer-events-none disabled:opacity-50",
);

interface Props {
  product: ShopProductRow;
  isFavorite: boolean;
  isFavoritePending?: boolean;
  onToggleFavorite: () => void;
  onQuickAdd: () => void;
}

function categoryChipLabel(category: string) {
  const label =
    SHOP_CATEGORY_LABEL[
      category as keyof typeof SHOP_CATEGORY_LABEL
    ];
  return label ?? category;
}

export function ShopCatalogProductCard({
  product: p,
  isFavorite,
  isFavoritePending,
  onToggleFavorite,
  onQuickAdd,
}: Props) {
  const detailHref = `/shop/${p.id}`;
  const minPrice =
    p.variants.length === 0 ?
      0
    : Math.min(...p.variants.map((v) => Number(v.price)));
  const showPriceFrom =
    p.variants.length > 1 && new Set(p.variants.map((v) => v.price)).size > 1;
  const listStrike = catalogListStrikePrice(p.variants);

  const priceAriaLabel =
    listStrike != null ?
      `優惠價 ${formatShopGroupedInteger(minPrice)} 元，原價 ${formatShopGroupedInteger(listStrike)} 元`
    : `售價 ${formatShopGroupedInteger(minPrice)} 元`;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl",
        "border-hairline border-border bg-card transition-colors hover:border-primary/40",
      )}
    >
      <Link href={detailHref} className="flex min-h-0 flex-1 flex-col">
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-t-xl bg-muted">
          {p.image_url ? (
            <Image
              src={p.image_url}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
              unoptimized
            />
          ) : null}
          <span className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] truncate rounded-full bg-primary-light px-2.5 py-0.5 text-caption font-medium text-primary-foreground">
            {categoryChipLabel(p.category)}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3 pb-2">
          <p className="text-caption text-muted-foreground">
            {p.brand?.name ?? ""}
          </p>
          <p className="mt-0.5 line-clamp-2 text-body font-medium leading-snug text-foreground">
            {p.name}
          </p>
        </div>
      </Link>
      <div className="space-y-0.5 px-3 pb-3">
        <Link
          href={detailHref}
          aria-label={priceAriaLabel}
          className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left font-medium leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          {listStrike != null ? (
            <span className="text-caption font-medium tabular-nums line-through text-muted-foreground">
              {'$'}
              {formatShopGroupedInteger(listStrike)}
            </span>
          ) : null}
          <span className="text-heading-section font-medium tabular-nums text-primary">
            {'$'}
            {formatShopGroupedInteger(minPrice)}
          </span>
          {showPriceFrom ? (
            <span className="text-caption font-medium text-muted-foreground">
              起
            </span>
          ) : null}
        </Link>
        <div className="flex justify-end gap-0 leading-none">
          <button
            type="button"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "取消我的最愛" : "加入我的最愛"}
            disabled={isFavoritePending}
            className={ICON_ACTION_CLASS}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Heart
              className={cn(
                "h-[18px] w-[18px]",
                isFavorite && "fill-current text-primary",
              )}
              strokeWidth={2.5}
              aria-hidden
            />
          </button>
          <button
            type="button"
            aria-label="加入購物車"
            className={ICON_ACTION_CLASS}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickAdd();
            }}
          >
            <ShoppingCart
              className="h-[18px] w-[18px]"
              strokeWidth={2.5}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </div>
  );
}
