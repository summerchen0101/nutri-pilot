import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CartView } from '@/app/(main)/shop/cart/cart-view';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { PageHeader } from '@/components/layout/page-header';
import { getCachedAuthContext } from '@/lib/auth';

export default async function ShopCartPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  return (
    <div className="space-y-4">
      <PageHeader
        leading={<HeaderBackButton />}
        title="購物車"
        action={
          <Link href="/shop" className="text-[13px] font-medium text-primary">
            繼續逛
          </Link>
        }
      />
      <CartView />
    </div>
  );
}
