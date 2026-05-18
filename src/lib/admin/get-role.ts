import { createClient } from '@/lib/supabase/server';

import type { AdminRole } from './admin-role';

export type { AdminRole } from './admin-role';

export async function getAdminRole(): Promise<AdminRole | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const raw = user?.app_metadata?.admin_role;
  if (raw === 'super_admin' || raw === 'editor' || raw === 'cs') {
    return raw;
  }
  return null;
}
