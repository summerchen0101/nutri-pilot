'use client';

import { useState } from 'react';

import { reorderOrderToCart } from '@/app/(main)/settings/orders/actions';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/shop/cart-store';

export interface OrderBuyAgainButtonProps {
  orderId: string;
  className?: string;
}

export function OrderBuyAgainButton({ orderId, className }: OrderBuyAgainButtonProps) {
  const addLine = useCartStore((s) => s.addLine);
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleClick() {
    setPending(true);
    setMessage(null);
    setIsError(false);

    const result = await reorderOrderToCart(orderId);

    if (!result.ok) {
      setIsError(true);
      setMessage(result.error);
      setPending(false);
      return;
    }

    for (const line of result.lines) {
      addLine(line);
    }

    openCartPanel();

    if (result.skipped.length === 0) {
      setMessage('已加入購物車');
    } else {
      setMessage(
        `已加入 ${result.addedCount} 項，${result.skipped.length} 項無法加入（已下架／無庫存）`,
      );
    }

    setPending(false);
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => void handleClick()}
      >
        {pending ? '加入中…' : '再買一次'}
      </Button>
      {message ?
        <p
          className={`mt-1 text-caption ${isError ? 'text-[#E24B4A]' : 'text-muted-foreground'}`}
          role={isError ? 'alert' : 'status'}
        >
          {message}
        </p>
      : null}
    </div>
  );
}
