'use client';

import { CapacitorAppListener } from '@/components/capacitor/capacitor-app-listener';

export function CapacitorRootProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <CapacitorAppListener />
      {children}
    </>
  );
}
