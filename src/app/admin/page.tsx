import { redirect } from 'next/navigation';

import { adminHomeForRole, getAdminRole } from '@/lib/admin';

export default async function AdminRootPage() {
  const role = await getAdminRole();
  if (!role) {
    redirect('/admin/login');
  }
  redirect(adminHomeForRole(role));
}
