"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";

import type { ShopProductRow } from "@/app/(main)/shop/shop-home-client";
import { formatShopGroupedInteger } from "@/lib/shop/format-shop-number";
import { cn } from "@/lib/utils/cn";

const ICON_BUTTON_CLASS = cn(
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
  "border-hairline border-[var(--color-background-primary)]/50",
  "bg-[color-mix(in_srgb,var(--color-background-primary)_78%,transparent)] backdrop-blur-sm",
  "text-primary shadow-sm",
  "transition-colors hover:bg-primary hover:text-white hover:border-transparent",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1",
);

interface Props {
  product: ShopProductRow;
  isFavorite: boolean;
  isFavoritePending?: boolean;
  onToggleFavorite: () => void;
  onQuickAdd: () => void;
}

export function ShopCatalogProductCard({
  product: p,
  isFavorite,
  isFavoritePending,
  onToggleFavorite,
  onQuickAdd,
}: Props) {
  const minPrice = Math.min(...p.variants.map((v) => Number(v.price)));

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl",
        "border-hairline border-transparent bg-card transition-colors hover:border-primary/50",
      )}>
      <Link href={`/shop/${p.id}`} className="flex min-h-0 flex-1 flex-col">
        <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
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
          {p.score > 0 ? (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-white tabular-nums">
              推薦 {formatShopGroupedInteger(p.score)}
            </span>
          ) : null}
          <div className="pointer-events-none absolute bottom-2 right-2 z-20 flex gap-1">
            <button
              type="button"
              aria-label="加入購物車"
              className={cn(ICON_BUTTON_CLASS, "pointer-events-auto")}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAdd();
              }}>
              <ShoppingCart className="h-[18px] w-[18px]" aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "取消我的最愛" : "加入我的最愛"}
              disabled={isFavoritePending}
              className={cn(ICON_BUTTON_CLASS, "pointer-events-auto")}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite();
              }}>
              <Heart
                className={cn(
                  "h-[18px] w-[18px]",
                  isFavorite && "fill-current",
                )}
                aria-hidden
              />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
            {p.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {p.brand?.name ?? ""}
          </p>
          <p className="mt-2 text-[13px] font-medium tabular-nums text-foreground">
            NT$ {formatShopGroupedInteger(minPrice)}
            <span className="text-[11px] font-normal text-muted-foreground">
              {" "}
              起
            </span>
          </p>
        </div>
      </Link>
    </div>
  );
}
