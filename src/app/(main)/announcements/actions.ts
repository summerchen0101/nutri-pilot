'use server';

import { createClient } from '@/lib/supabase/server';

export async function markAnnouncementsReadForUser(
  announcementIds: string[],
): Promise<void> {
  if (announcementIds.length === 0) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from('user_announcement_reads')
    .select('announcement_id')
    .eq('user_id', user.id)
    .in('announcement_id', announcementIds);

  const have = new Set(
    (existing ?? []).map((row) => row.announcement_id as string),
  );
  const missing = announcementIds.filter((id) => !have.has(id));
  if (missing.length === 0) return;

  await supabase.from('user_announcement_reads').insert(
    missing.map((announcement_id) => ({
      user_id: user.id,
      announcement_id,
    })),
  );
}
