import Link from 'next/link';

import {
  adminListTableThClassName,
  adminListTableTheadClassName,
} from '@/app/admin/_lib/admin-list-table-classes';
import { createClient } from '@/lib/supabase/server';

export default async function AdminVendorsPage() {
  const supabase = createClient();
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id, name, slug, is_active, banner_url')
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading-screen text-foreground">廠商</h1>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-body">
          <thead className={adminListTableTheadClassName}>
            <tr>
              <th className={adminListTableThClassName}>名稱</th>
              <th className={adminListTableThClassName}>slug</th>
              <th className={adminListTableThClassName}>Banner</th>
              <th className={adminListTableThClassName}>狀態</th>
              <th className={adminListTableThClassName}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(vendors ?? []).map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3">{v.name}</td>
                <td className="px-4 py-3 font-mono text-caption">{v.slug}</td>
                <td className="px-4 py-3">
                  {v.banner_url ?
                    <span className="text-caption text-[#2D6B4A]">已設定</span>
                  : <span className="text-caption text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3">
                  {v.is_active ?
                    <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-caption font-medium text-[#2D6B4A]">
                      上架
                    </span>
                  : <span className="text-caption text-slate-600">停用</span>}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/vendors/${v.id}`}
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
    </div>
  );
}
