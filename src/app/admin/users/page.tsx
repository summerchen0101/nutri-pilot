import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type AdminUserRow =
  Database['public']['Functions']['admin_users_directory']['Returns'][number];

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: rows, error } = await supabase.rpc('admin_users_directory', {
    p_limit: 500,
  });

  if (error) {
    throw new Error(error.message);
  }

  const userRows: AdminUserRow[] = rows ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-heading-screen text-foreground">用戶</h1>
      <p className="text-body text-slate-600">
        列表僅供客服／超管查閱；詳細個資請遵循內部規範。
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-body">
          <thead className="border-b border-border bg-secondary/40 text-caption uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">飲食法</th>
              <th className="px-4 py-3 font-medium">更新</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {userRows.map((row) => (
              <tr key={row.user_id}>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.email ?? '—'}</td>
                <td className="px-4 py-3">{row.diet_method ?? '—'}</td>
                <td className="px-4 py-3 text-caption text-slate-600">
                  {row.updated_at
                    ? new Date(row.updated_at).toLocaleDateString('zh-TW')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${row.user_id}`}
                    className="text-[#4C956C] hover:underline"
                  >
                    詳情
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
