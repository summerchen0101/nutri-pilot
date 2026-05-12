import { redirect } from 'next/navigation';

import { ShopCartPageClient } from '@/app/(main)/shop/cart/shop-cart-page-client';
import { getCachedAuthContext } from '@/lib/auth';

export default async function ShopCartPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  return <ShopCartPageClient />;
}
