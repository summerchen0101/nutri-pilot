import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

/**
 * 同一個 RSC request 內共用一次 Auth 與 Supabase browser client，
 * 避免 layout 與 page 各自 createClient().getUser()。
 */
export const getCachedAuthContext = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  return { supabase, user, authError };
});
