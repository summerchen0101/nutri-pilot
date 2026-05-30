'use client';

import { useSearchParams } from 'next/navigation';

import { LogisticsMapBridgeClient } from '@/app/(main)/shop/logistics-map-bridge/logistics-map-bridge-client';

export function LogisticsMapBridgeClientLoader() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId')?.trim() ?? '';
  const vendorId = searchParams.get('vendorId')?.trim() ?? '';

  return <LogisticsMapBridgeClient orderId={orderId} vendorId={vendorId} />;
}
