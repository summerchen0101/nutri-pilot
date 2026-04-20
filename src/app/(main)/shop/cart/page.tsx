import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CartView } from '@/app/(main)/shop/cart/cart-view';
import { PageHeader } from '@/components/layout/page-header';
import { createClient } from '@/lib/supabase/server';

export default async function ShopCartPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="space-y-4">
      <PageHeader
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
