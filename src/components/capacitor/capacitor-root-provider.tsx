'use client';

import { CapacitorAppListener } from '@/components/capacitor/capacitor-app-listener';
import { EcpayBrowserListener } from '@/components/capacitor/ecpay-browser-listener';

export function CapacitorRootProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <CapacitorAppListener />
      <EcpayBrowserListener />
      {children}
    </>
  );
}
