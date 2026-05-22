import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { ShopCartPanel } from '@/app/(main)/shop/_components/shop-cart-panel';
import { ShopCatalogPanels } from '@/app/(main)/shop/_components/shop-catalog-panels';
import { ShopCategoriesProvider } from '@/app/(main)/shop/_components/shop-categories-context';
import { ShopCheckoutPanel } from '@/app/(main)/shop/_components/shop-checkout-panel';
import { ShopEcpayReturnHandler } from '@/app/(main)/shop/_components/shop-ecpay-return-handler';
import { ShopEcpayPaymentWatcher } from '@/app/(main)/shop/_components/shop-ecpay-payment-watcher';
import { ShopLayoutSerifScope } from '@/app/(main)/shop/shop-layout-serif';
import { getCachedAuthContext } from '@/lib/auth';
import { getActiveShopCategories } from '@/lib/shop/get-shop-categories';

export default async function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await getCachedAuthContext();
  if (!user) redirect('/login');

  const categories = await getActiveShopCategories(supabase);

  return (
    <ShopCategoriesProvider categories={categories}>
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
    </ShopCategoriesProvider>
  );
}
