import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  adminListTableThClassName,
  adminListTableTheadClassName,
} from '@/app/admin/_lib/admin-list-table-classes';
import { getAdminRole } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

const PAGE_SIZE = 50;

type AdminLogRow = Database['public']['Tables']['admin_logs']['Row'];

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.floor(n);
}

function formatTaipeiTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-TW', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Asia/Taipei',
  });
}

function metadataSnippet(meta: unknown): string {
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

interface AdminAuditLogPageProps {
  searchParams?: { page?: string };
}

export default async function AdminSettingsAuditPage({
  searchParams,
}: AdminAuditLogPageProps) {
  const role = await getAdminRole();
  if (role !== 'super_admin') {
    redirect('/admin');
  }

  const page = parsePositiveInt(searchParams?.page, 1);
  const offset = (page - 1) * PAGE_SIZE;
  const offsetEnd = offset + PAGE_SIZE - 1;

  const supabase = createClient();
  const { data: rows, error, count } = await supabase
    .from('admin_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offsetEnd);

  if (error) {
    throw new Error(error.message);
  }

  const list: AdminLogRow[] = rows ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-caption text-muted-foreground">
          <Link
            href="/admin/settings"
            className="text-primary underline underline-offset-2 hover:opacity-90"
          >
            返回後台設定
          </Link>
        </p>
        <h1 className="text-heading-screen text-foreground">稽核紀錄</h1>
        <p className="text-body text-slate-600">
          append-only：由後台異動成功後或 Edge 驗證通過後寫入 · 總計 {total} 筆
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-left text-body">
          <thead className={adminListTableTheadClassName}>
            <tr>
              <th className={adminListTableThClassName}>時間</th>
              <th className={adminListTableThClassName}>操作者（admin_id）</th>
              <th className={adminListTableThClassName}>動作</th>
              <th className={adminListTableThClassName}>對象類型</th>
              <th className={adminListTableThClassName}>對象 ID</th>
              <th className={adminListTableThClassName}>metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 ? (
              <tr>
                <td
                  className="p-4 text-caption text-muted-foreground"
                  colSpan={6}
                >
                  尚無紀錄（部署 migration 並執行一次後台操作後會出現）。
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className="align-top odd:bg-muted/40">
                  <td className="whitespace-nowrap p-4 text-caption text-foreground">
                    {formatTaipeiTime(row.created_at)}
                  </td>
                  <td className="p-4 font-mono text-caption">{row.admin_id}</td>
                  <td className="p-4 text-body">{row.action}</td>
                  <td className="p-4 text-caption text-muted-foreground">
                    {row.target_type ?? '—'}
                  </td>
                  <td className="max-w-[200px] break-all p-4 font-mono text-caption">
                    {row.target_id ?? '—'}
                  </td>
                  <td className="max-w-md p-4 font-mono text-caption leading-relaxed text-muted-foreground">
                    {metadataSnippet(row.metadata)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav className="flex flex-wrap items-center gap-2 text-caption">
          {page > 1 ? (
            <Link
              href={`/admin/settings/audit?page=${page - 1}`}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted/60"
            >
              上一頁
            </Link>
          ) : (
            <span className="text-muted-foreground">上一頁</span>
          )}
          <span className="text-foreground">
            第 {page} / {totalPages} 頁
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/settings/audit?page=${page + 1}`}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted/60"
            >
              下一頁
            </Link>
          ) : (
            <span className="text-muted-foreground">下一頁</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
