import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CartView } from '@/app/(main)/shop/cart/cart-view';
import { createClient } from '@/lib/supabase/server';

export default async function ShopCartPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-[20px] font-medium text-foreground">購物車</h1>
        <Link
          href="/shop"
          className="text-[13px] font-medium text-[#4C956C]"
        >
          繼續逛
        </Link>
      </div>
      <CartView />
    </div>
  );
}
