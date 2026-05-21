'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { assertOrderPayable } from '@/app/(main)/shop/actions';
import { Button } from '@/components/ui/button';
import { openOrderPayment } from '@/lib/shop/open-order-payment';

export interface ContinueOrderPaymentButtonProps {
  orderId: string;
  className?: string;
}

export function ContinueOrderPaymentButton({
  orderId,
  className,
}: ContinueOrderPaymentButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const check = await assertOrderPayable(orderId);
    if (!check.ok) {
      setError(check.error);
      setPending(false);
      return;
    }

    const result = await openOrderPayment(orderId);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    setPending(false);
    router.refresh();
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="default"
        size="sm"
        disabled={pending}
        onClick={() => void handleClick()}
      >
        {pending ? '開啟付款…' : '繼續付款'}
      </Button>
      {error ? (
        <p className="mt-1 text-caption text-[#E24B4A]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
