'use client';

import { Package } from 'lucide-react';
import Image from 'next/image';

import { ShopQuantityStepper } from '@/app/(main)/shop/_components/shop-quantity-stepper';
import type { CartLine } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';

interface CartLineRowProps {
  line: CartLine;
  onQuantityChange: (variantId: string, nextQty: number) => void;
  onRemove: (variantId: string) => void;
}

export function CartLineRow({ line, onQuantityChange, onRemove }: CartLineRowProps) {
  const lineTotal = line.unitPrice * line.qty;

  function handleQty(next: number) {
    if (next <= 0) {
      onRemove(line.variantId);
      return;
    }
    onQuantityChange(line.variantId, next);
  }

  return (
    <div className="flex gap-3 py-3">
      <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted">
        {line.imageUrl ?
          <Image
            src={line.imageUrl}
            alt=""
            width={72}
            height={72}
            className="h-full w-full object-cover"
            sizes="72px"
          />
        : <div
            className="flex h-full w-full items-center justify-center text-muted-foreground"
            aria-hidden>
            <Package className="h-7 w-7" />
          </div>
        }
      </div>
      <div className="min-w-0 flex-1">
        <span className="mb-1 inline-block rounded-full bg-primary-light px-2 py-0.5 text-micro font-medium text-primary">
          廠商出貨
        </span>
        <p className="text-heading-section leading-snug text-foreground">{line.productName}</p>
        {line.variantLabel ?
          <p className="mt-0.5 text-micro text-muted-foreground">{line.variantLabel}</p>
        : null}

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="w-fit text-caption font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => onRemove(line.variantId)}>
              刪除
            </button>
            <ShopQuantityStepper
              value={line.qty}
              minimumQuantity={0}
              size="compact"
              className="gap-2"
              onChange={handleQty}
            />
          </div>
          <div className="text-right">
            <p className="text-heading-section tabular-nums text-foreground">
              NT$ {formatShopGroupedInteger(lineTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
