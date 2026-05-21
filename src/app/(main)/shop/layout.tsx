import { Suspense } from 'react';

import { ShopCartPanel } from '@/app/(main)/shop/_components/shop-cart-panel';
import { ShopCatalogPanels } from '@/app/(main)/shop/_components/shop-catalog-panels';
import { ShopCheckoutPanel } from '@/app/(main)/shop/_components/shop-checkout-panel';
import { ShopEcpayReturnHandler } from '@/app/(main)/shop/_components/shop-ecpay-return-handler';
import { ShopEcpayPaymentWatcher } from '@/app/(main)/shop/_components/shop-ecpay-payment-watcher';
import { ShopLayoutSerifScope } from '@/app/(main)/shop/shop-layout-serif';

export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ShopLayoutSerifScope>
      {children}
      <Suspense fallback={null}>
        <ShopEcpayReturnHandler />
        <ShopEcpayPaymentWatcher />
      </Suspense>
      <ShopCatalogPanels />
      <ShopCartPanel />
      <ShopCheckoutPanel />
    </ShopLayoutSerifScope>
  );
}
