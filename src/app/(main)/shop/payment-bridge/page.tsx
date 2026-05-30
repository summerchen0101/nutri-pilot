import { Suspense } from 'react';

import { PaymentBridgeClient } from '@/app/(main)/shop/payment-bridge/payment-bridge-client';
import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { cn } from '@/lib/utils/cn';

export default function PaymentBridgePage() {
  return (
    <div className={cn(STICKY_PAGE_HEADER_TOP_SAFE_CLASS)}>
      <Suspense
        fallback={
          <div className="mx-auto max-w-md px-4 py-12 text-center">
            <p className="text-body text-muted-foreground">載入付款…</p>
          </div>
        }
      >
        <PaymentBridgeClient />
      </Suspense>
    </div>
  );
}
