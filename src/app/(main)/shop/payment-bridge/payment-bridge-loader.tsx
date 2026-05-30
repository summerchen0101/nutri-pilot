'use client';

import { useSearchParams } from 'next/navigation';

import { PaymentBridgeClient } from '@/app/(main)/shop/payment-bridge/payment-bridge-client';

export function PaymentBridgeClientLoader() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId')?.trim() ?? '';

  return <PaymentBridgeClient orderId={orderId} />;
}
