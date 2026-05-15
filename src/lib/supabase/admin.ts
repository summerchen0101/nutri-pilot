import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

/** 僅限伺服端（含 Route Handler）；需 SUPABASE_SERVICE_ROLE_KEY。不可於 Client 引用。 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('createServiceRoleClient: missing Supabase URL or service role key');
  }
  return createClient<Database>(url, key);
}
