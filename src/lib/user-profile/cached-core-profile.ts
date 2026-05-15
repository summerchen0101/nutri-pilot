import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

/** 主分頁 layout／dashboard／shop 共用的 profile 欄位（單一 RSC request 內只查一次） */
const USER_PROFILE_CORE_SELECT =
  'name, weight_kg, height_cm, bmi, diet_method, diet_type, allergens, shop_personalize_recommendations, personal_context_facets';

export const getCachedUserProfileCoreRow = cache(
  async (client: SupabaseClient<Database>, userId: string) => {
    return client
      .from('user_profiles')
      .select(USER_PROFILE_CORE_SELECT)
      .eq('user_id', userId)
      .maybeSingle();
  },
);
