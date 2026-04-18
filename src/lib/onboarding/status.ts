import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

/** 已至少有一筆「啟用中」飲食計畫視為完成 Onboarding（Step 5）。 */
export async function hasCompletedOnboarding(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('diet_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return false;
  return !!data;
}
