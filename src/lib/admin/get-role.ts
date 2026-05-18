import { createClient } from '@/lib/supabase/server';

export type AdminRole = 'super_admin' | 'editor' | 'cs';

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
