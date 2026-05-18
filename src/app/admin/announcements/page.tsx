import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  adminListTableThClassName,
  adminListTableTheadClassName,
} from '@/app/admin/_lib/admin-list-table-classes';
import { buttonVisualClassName } from '@/components/ui/button-visual';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

function formatZh(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('zh-Hant', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function AdminAnnouncementsPage() {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'announcement.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from('announcements')
    .select('id, title, published_at, is_active, created_at')
    .order('published_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading-screen text-foreground">公告</h1>
        <Link
          href="/admin/announcements/new"
          className={buttonVisualClassName({ variant: 'default' })}
        >
          新增公告
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-body">
          <thead className={adminListTableTheadClassName}>
            <tr>
              <th className={adminListTableThClassName}>標題</th>
              <th className={adminListTableThClassName}>發布時間</th>
              <th className={adminListTableThClassName}>狀態</th>
              <th className={adminListTableThClassName} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(rows ?? []).map((row) => (
              <tr key={row.id as string}>
                <td className="px-4 py-3 font-medium">{row.title as string}</td>
                <td className="px-4 py-3 text-caption text-muted-foreground">
                  {formatZh(row.published_at as string)}
                </td>
                <td className="px-4 py-3">
                  {(row.is_active as boolean | null) ? (
                    <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-caption font-medium text-[#2D6B4A]">
                      啟用
                    </span>
                  ) : (
                    <span className="text-caption text-slate-600">草稿／下架</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/announcements/${row.id as string}`}
                    className="text-[#4C956C] hover:underline"
                  >
                    編輯
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(rows ?? []).length === 0 ? (
        <p className="text-caption text-muted-foreground">尚無公告，請新增一則。</p>
      ) : null}
    </div>
  );
}
