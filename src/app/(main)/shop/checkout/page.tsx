import { redirect } from 'next/navigation';

import { CheckoutClient } from '@/app/(main)/shop/checkout/checkout-client';
import { getCachedAuthContext } from '@/lib/auth';

export default async function ShopCheckoutPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select(
      'diet_method, shipping_recipient_name, shipping_phone, shipping_address_full',
    )
    .eq('user_id', user.id)
    .single();

  if (profileErr || !profile?.diet_method) redirect('/onboarding');

  return (
    <CheckoutClient
      defaultRecipientName={
        (profile.shipping_recipient_name as string | null) ?? ''
      }
      defaultPhone={(profile.shipping_phone as string | null) ?? ''}
      defaultAddressFull={
        (profile.shipping_address_full as string | null) ?? ''
      }
    />
  );
}
