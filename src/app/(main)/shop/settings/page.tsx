import { redirect } from 'next/navigation';

import { ShopSettingsPageClient } from '@/app/(main)/shop/settings/shop-settings-page-client';
import { dietMethodLabel } from '@/app/(main)/settings/_lib/formatters';
import { getCachedAuthContext } from '@/lib/auth';

export default async function ShopSettingsPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const [{ data: profile, error: profileErr }, { data: nextExpiryRows, error: expiryErr }] =
    await Promise.all([
      supabase
        .from('user_profiles')
        .select('diet_method, shop_personalize_recommendations, shop_points_balance')
        .eq('user_id', user.id)
        .single(),
      supabase.rpc('get_shop_points_next_expiry'),
    ]);

  if (profileErr || !profile) redirect('/onboarding');
  if (expiryErr) {
    throw new Error(expiryErr.message);
  }

  const dietMethod = (profile.diet_method as string) ?? 'mediterranean';
  const shopPointsBalance = Number(profile.shop_points_balance ?? 0);
  const nextExpiry = nextExpiryRows?.[0];

  return (
    <ShopSettingsPageClient
      dietMethodSummaryText={dietMethodLabel(dietMethod)}
      personalizeFromDietInitial={
        profile.shop_personalize_recommendations !== false
      }
      shopPointsBalance={shopPointsBalance}
      nextExpiringPoints={nextExpiry != null ? Number(nextExpiry.points) : null}
      nextExpiryAt={nextExpiry?.expires_at ?? null}
    />
  );
}
