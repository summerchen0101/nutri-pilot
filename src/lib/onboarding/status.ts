import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export async function hasCompletedOnboarding(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('user_profiles')
    .select('diet_method')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.diet_method;
}
