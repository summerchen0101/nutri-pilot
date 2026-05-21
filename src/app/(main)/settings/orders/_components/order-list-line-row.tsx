import { Package } from 'lucide-react';
import Image from 'next/image';

import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import type { MemberOrderBreakdownLine } from '@/lib/shop/build-member-order-payment-breakdown';

export interface OrderListLineRowProps {
  line: MemberOrderBreakdownLine;
}

export function OrderListLineRow({ line }: OrderListLineRowProps) {
  const lineTotal = line.unitPrice * line.qty;

  return (
    <div className="flex gap-2.5 text-body text-foreground">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--shop-field-surface)]">
        {line.imageUrl ?
          <Image
            src={line.imageUrl}
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
            sizes="48px"
          />
        : <div
            className="flex h-full w-full items-center justify-center text-muted-foreground"
            aria-hidden
          >
            <Package className="h-6 w-6" />
          </div>
        }
      </div>
      <div className="min-w-0 flex-1 leading-snug">
        <p className="text-body text-foreground">{line.productName}</p>
        <p className="mt-0.5 text-caption text-muted-foreground">{line.variantLabel}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 self-start text-right">
        <span className="tabular-nums text-body text-foreground">
          NT$ {formatShopGroupedInteger(lineTotal)}
        </span>
        <span className="tabular-nums text-caption text-muted-foreground">
          × {formatShopGroupedInteger(line.qty)}
        </span>
      </div>
    </div>
  );
}
