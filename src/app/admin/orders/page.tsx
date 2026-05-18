import Link from 'next/link';

import {
  adminListTableThClassName,
  adminListTableTheadClassName,
} from '@/app/admin/_lib/admin-list-table-classes';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type AdminOrderRow =
  Database['public']['Functions']['admin_orders_for_staff']['Returns'][number];

export default async function AdminOrdersPage() {
  const supabase = createClient();
  const { data: rows, error } = await supabase.rpc('admin_orders_for_staff', {
    p_limit: 200,
  });

  if (error) {
    throw new Error(error.message);
  }

  const orderRows: AdminOrderRow[] = rows ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-heading-screen text-foreground">訂單</h1>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-body">
          <thead className={adminListTableTheadClassName}>
            <tr>
              <th className={adminListTableThClassName}>訂單編號</th>
              <th className={adminListTableThClassName}>買家</th>
              <th className={adminListTableThClassName}>狀態</th>
              <th className={adminListTableThClassName}>金額</th>
              <th className={adminListTableThClassName}>建立時間</th>
              <th className={adminListTableThClassName}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orderRows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono text-caption">
                  {row.public_order_no ?? row.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">{row.buyer_email ?? '—'}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">
                  NT${' '}
                  {Number(row.total).toLocaleString('zh-TW', {
                    minimumFractionDigits: 0,
                  })}
                </td>
                <td className="px-4 py-3 text-caption text-slate-600">
                  {new Date(row.created_at).toLocaleString('zh-TW')}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${row.id}`}
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
