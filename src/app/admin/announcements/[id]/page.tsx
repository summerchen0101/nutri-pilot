import { notFound, redirect } from 'next/navigation';

import { AnnouncementForm } from '@/app/admin/announcements/_components/announcement-form';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminAnnouncementEditPage({
  params,
}: Readonly<{ params: { id: string } }>) {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'announcement.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('announcements')
    .select('id, title, body, published_at, is_active')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!row) {
    notFound();
  }

  const allowDelete = staffCan(role, 'announcement.delete');

  return (
    <AnnouncementForm
      initial={{
        id: row.id as string,
        title: row.title as string,
        body: row.body as string,
        published_at: row.published_at as string,
        is_active: row.is_active as boolean | null,
      }}
      allowDelete={allowDelete}
    />
  );
}
