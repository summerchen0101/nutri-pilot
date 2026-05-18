import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVisualClassName } from '@/components/ui/button-visual';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPromotionsPage() {
  const role = await getAdminRole();
  if (!staffCan(role, 'promo.manage')) {
    redirect('/admin/dashboard');
  }

  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from('promo_campaigns')
    .select('id,title,is_active,discount_kind,discount_value,updated_at,show_in_member_app')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const list = rows ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-screen text-foreground">優惠活動</h1>
          <p className="mt-1 text-caption text-slate-600">
            活動主檔與優惠碼；結帳自動折抵請後續接單。
          </p>
        </div>
        <Link
          href="/admin/promotions/new"
          className={buttonVisualClassName({ variant: 'default', size: 'sm' })}
        >
          新增活動
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full border-collapse text-left text-body">
          <thead className="bg-secondary text-caption text-slate-600">
            <tr>
              <th className="border-b border-border px-3 py-2">標題</th>
              <th className="border-b border-border px-3 py-2">折扣</th>
              <th className="border-b border-border px-3 py-2">狀態</th>
              <th className="border-b border-border px-3 py-2">會員頁</th>
              <th className="border-b border-border px-3 py-2">更新</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="odd:bg-background even:bg-secondary/40">
                <td className="border-b border-border px-3 py-2">
                  <Link
                    href={`/admin/promotions/${r.id}`}
                    className="text-[#4C956C] hover:underline"
                  >
                    {r.title}
                  </Link>
                </td>
                <td className="border-b border-border px-3 py-2 text-caption">
                  {r.discount_kind === 'percent' ?
                    `${r.discount_value}%`
                  : `NT$ ${Number(r.discount_value).toLocaleString('zh-TW')}`}
                </td>
                <td className="border-b border-border px-3 py-2 text-caption">
                  {r.is_active ? '啟用' : '停用'}
                </td>
                <td className="border-b border-border px-3 py-2 text-caption">
                  {r.show_in_member_app ? '顯示' : '—'}
                </td>
                <td className="border-b border-border px-3 py-2 text-caption whitespace-nowrap">
                  {r.updated_at ?
                    new Date(r.updated_at).toLocaleString('zh-TW')
                  : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 ?
        <p className="text-caption text-slate-600">尚無活動</p>
      : null}
    </div>
  );
}
