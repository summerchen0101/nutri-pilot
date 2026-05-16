"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";

import type { ShopProductRow } from "@/app/(main)/shop/shop-home-client";
import { SHOP_CATEGORY_LABEL } from "@/lib/shop/constants";
import { formatShopGroupedInteger } from "@/lib/shop/format-shop-number";
import { cn } from "@/lib/utils/cn";

const HEART_BUTTON_CLASS = cn(
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]",
  "border-hairline border-border bg-secondary transition-colors",
  "hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
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
  const prices = p.variants.map((v) => Number(v.price));
  const minPrice = Math.min(...prices);
  const showPriceFrom = new Set(prices).size > 1;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl",
        "border-hairline border-border bg-card transition-colors hover:border-primary/40",
      )}
    >
      <Link href={`/shop/${p.id}`} className="flex min-h-0 flex-1 flex-col">
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
          <span className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] truncate rounded-md bg-foreground/80 px-2 py-0.5 text-micro font-medium text-[var(--color-background-primary)]">
            {categoryChipLabel(p.category)}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <p className="text-caption text-muted-foreground">
            {p.brand?.name ?? ""}
          </p>
          <p className="mt-0.5 line-clamp-2 text-body font-medium leading-snug text-foreground">
            {p.name}
          </p>
          <p className="mt-2 text-body font-medium tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(minPrice)}
            {showPriceFrom ? (
              <span className="text-caption font-normal text-muted-foreground">
                {" "}
                起
              </span>
            ) : null}
          </p>
        </div>
      </Link>
      <div className="flex gap-2 px-3 pb-3">
        <button
          type="button"
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px]",
            "border-hairline border-border bg-secondary text-body font-medium text-foreground",
            "transition-colors hover:bg-muted active:opacity-95",
          )}
          onClick={(e) => {
            e.preventDefault();
            onQuickAdd();
          }}
        >
          <ShoppingCart
            className="h-4 w-4 shrink-0 text-[var(--steel-accent)]"
            aria-hidden
          />
          購買
        </button>
        <button
          type="button"
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "取消我的最愛" : "加入我的最愛"}
          disabled={isFavoritePending}
          className={HEART_BUTTON_CLASS}
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite();
          }}
        >
          <Heart
            className={cn(
              "h-[18px] w-[18px] text-muted-foreground",
              isFavorite && "fill-current text-primary",
            )}
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}
