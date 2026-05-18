import { AdminChrome } from '@/app/admin/_components/admin-chrome';
import { getAdminRole } from '@/lib/admin';

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const role = await getAdminRole();

  return <AdminChrome role={role}>{children}</AdminChrome>;
}
