import { Suspense } from 'react';

import { PaymentBridgeClient } from '@/app/(main)/shop/payment-bridge/payment-bridge-client';

export default function PaymentBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <p className="text-body text-muted-foreground">載入付款…</p>
        </div>
      }
    >
      <PaymentBridgeClient />
    </Suspense>
  );
}
