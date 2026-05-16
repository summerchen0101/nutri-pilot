import { redirect } from 'next/navigation';

import { ShopSettingsPageClient } from '@/app/(main)/shop/settings/shop-settings-page-client';
import { dietMethodLabel } from '@/app/(main)/settings/_lib/formatters';
import { getCachedAuthContext } from '@/lib/auth';

export default async function ShopSettingsPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('diet_method, shop_personalize_recommendations')
    .eq('user_id', user.id)
    .single();

  if (error || !profile) redirect('/onboarding');

  const dietMethod = (profile.diet_method as string) ?? 'mediterranean';

  return (
    <ShopSettingsPageClient
      dietMethodSummaryText={dietMethodLabel(dietMethod)}
      personalizeFromDietInitial={
        profile.shop_personalize_recommendations !== false
      }
    />
  );
}
