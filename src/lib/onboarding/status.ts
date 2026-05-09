import type { SupabaseClient } from '@supabase/supabase-js';

import { getCachedUserProfileCoreRow } from '@/lib/user-profile';
import type { Database } from '@/types/supabase';

export async function hasCompletedOnboarding(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await getCachedUserProfileCoreRow(client, userId);

  if (error) return false;
  return !!data?.diet_method;
}
