'use client';

import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import { cn } from '@/lib/utils/cn';

const BTN =
  'flex h-11 w-11 items-center justify-center rounded-[10px] border-hairline border-border text-heading-section focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1';

const BTN_COMPACT =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-hairline border-border text-[13px] font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1';

interface Props {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  /** 預設 1；設為 0 時「−」可減到 0（由父層決定是否移除列） */
  minimumQuantity?: number;
  size?: 'default' | 'compact';
  className?: string;
}

export function ShopQuantityStepper({
  value,
  onChange,
  max,
  minimumQuantity = 1,
  size = 'default',
  className,
}: Props) {
  const canIncrement = max === undefined || value < max;
  const btn = size === 'compact' ? BTN_COMPACT : BTN;
  const min = minimumQuantity;

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        size === 'default' && 'mt-1',
        size === 'compact' && 'gap-2',
        className,
      )}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span
        className={cn(
          'min-w-[2rem] text-center tabular-nums',
          size === 'compact' ?
            'min-w-[1.75rem] text-[13px] font-medium text-foreground'
          : 'text-heading-section',
        )}>
        {formatShopGroupedInteger(value)}
      </span>
      <button
        type="button"
        className={btn}
        disabled={!canIncrement}
        onClick={() => {
          if (!canIncrement) return;
          onChange(value + 1);
        }}>
        +
      </button>
    </div>
  );
}
