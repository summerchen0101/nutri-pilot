'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { fetchEcpayCheckoutPayload } from '@/app/(main)/shop/actions';
import { submitEcpayBridgeInDocument } from '@/lib/shop/submit-ecpay-bridge-form';

export function PaymentBridgeClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId')?.trim() ?? '';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('缺少訂單編號');
      return;
    }

    let cancelled = false;
    void (async () => {
      const bridge = await fetchEcpayCheckoutPayload({
        orderId,
        clientOrigin: window.location.origin,
      });
      if (cancelled) return;
      if (!bridge.ok) {
        setError(bridge.error);
        return;
      }
      submitEcpayBridgeInDocument(bridge);
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-body text-[#E24B4A]" role="alert">
          {error}
        </p>
        <a
          href="/shop"
          className="mt-4 inline-block text-body text-primary underline"
        >
          返回商城
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <p className="text-body text-muted-foreground">正在導向綠界付款…</p>
    </div>
  );
}
