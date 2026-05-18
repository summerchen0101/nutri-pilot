import { redirect } from 'next/navigation';

import { AnnouncementForm } from '@/app/admin/announcements/_components/announcement-form';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';

export default async function AdminNewAnnouncementPage() {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'announcement.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  return <AnnouncementForm allowDelete={false} />;
}
