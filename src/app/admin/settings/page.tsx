import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminSetRoleForm } from '@/app/admin/settings/_components/admin-set-role-form';
import { getAdminRole } from '@/lib/admin';

export default async function AdminSettingsPage() {
  const role = await getAdminRole();
  if (role !== 'super_admin') {
    redirect('/admin');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-heading-screen text-foreground">後台設定</h1>
        <p className="mt-1 text-body text-slate-600">
          角色存在 Auth <code className="font-mono text-caption">app_metadata.admin_role</code>。
        </p>
        <p className="mt-3 text-body">
          <Link
            href="/admin/settings/audit"
            className="font-medium text-primary underline underline-offset-2 hover:opacity-90"
          >
            查看稽核紀錄（super_admin）
          </Link>
        </p>
      </div>
      <AdminSetRoleForm />
    </div>
  );
}
