import { redirect } from 'next/navigation';

import { AdminLoginForm } from '@/app/admin/_components/admin-login-form';
import { STICKY_PAGE_HEADER_TOP_SAFE_CLASS } from '@/components/layout/sticky-page-header-top-safe-class';
import { getAdminRole } from '@/lib/admin';
import { cn } from '@/lib/utils/cn';

export default async function AdminLoginPage() {
  const role = await getAdminRole();
  if (role) {
    redirect('/admin');
  }

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12',
        STICKY_PAGE_HEADER_TOP_SAFE_CLASS,
      )}
    >
      <AdminLoginForm />
      <p className="mt-8 max-w-md text-center text-caption text-slate-600">
        第一次請由擁有 Service Role 者在 Supabase Dashboard 設定
        app_metadata.admin_role，或執行 scripts/set-first-admin.mjs。
      </p>
    </div>
  );
}
