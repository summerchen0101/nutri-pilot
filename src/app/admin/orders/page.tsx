import Link from 'next/link';

import {
  adminListTableThClassName,
  adminListTableTheadClassName,
} from '@/app/admin/_lib/admin-list-table-classes';
import { buttonVisualClassName } from '@/components/ui/button-visual';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type AdminOrderRow =
  Database['public']['Functions']['admin_orders_for_staff']['Returns'][number];

const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
] as const;

function parseDateStart(isoDate: string | undefined): string | undefined {
  if (!isoDate?.trim()) return undefined;
  return `${isoDate.trim()}T00:00:00.000Z`;
}

function parseDateEndExclusive(isoDate: string | undefined): string | undefined {
  if (!isoDate?.trim()) return undefined;
  const d = new Date(`${isoDate.trim()}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export default async function AdminOrdersPage({
  searchParams,
}: Readonly<{
  searchParams: Record<string, string | string[] | undefined>;
}>) {
  const statusParam =
    typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const searchParam =
    typeof searchParams.q === 'string' ? searchParams.q.trim() : undefined;
  const startParam =
    typeof searchParams.start === 'string' ? searchParams.start : undefined;
  const endParam =
    typeof searchParams.end === 'string' ? searchParams.end : undefined;

  const supabase = createClient();
  const { data: rows, error } = await supabase.rpc('admin_orders_for_staff', {
    p_limit: 200,
    p_status: statusParam && statusParam.length > 0 ? statusParam : undefined,
    p_start: parseDateStart(startParam),
    p_end: parseDateEndExclusive(endParam),
    p_search: searchParam && searchParam.length > 0 ? searchParam : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  const orderRows: AdminOrderRow[] = rows ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-heading-screen text-foreground">訂單</h1>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-background p-4"
      >
        <div className="space-y-1">
          <label htmlFor="ord-status" className="text-caption text-muted-foreground">
            狀態
          </label>
          <select
            id="ord-status"
            name="status"
            defaultValue={statusParam ?? ''}
            className="flex h-11 min-w-[8rem] rounded-[10px] border border-border bg-background px-3 text-body"
          >
            <option value="">全部</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="ord-start" className="text-caption text-muted-foreground">
            起日（UTC）
          </label>
          <input
            id="ord-start"
            type="date"
            name="start"
            defaultValue={startParam ?? ''}
            className="flex h-11 rounded-[10px] border border-border bg-background px-3 text-body"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ord-end" className="text-caption text-muted-foreground">
            迄日（UTC）
          </label>
          <input
            id="ord-end"
            type="date"
            name="end"
            defaultValue={endParam ?? ''}
            className="flex h-11 rounded-[10px] border border-border bg-background px-3 text-body"
          />
        </div>
        <div className="min-w-[12rem] flex-1 space-y-1">
          <label htmlFor="ord-q" className="text-caption text-muted-foreground">
            搜尋（編號／Email）
          </label>
          <input
            id="ord-q"
            type="search"
            name="q"
            defaultValue={searchParam ?? ''}
            placeholder="public_order_no、merchant_order_no、email"
            className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
          />
        </div>
        <button type="submit" className={buttonVisualClassName({ variant: 'default', size: 'sm' })}>
          篩選
        </button>
      </form>

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
            {orderRows.length === 0 ?
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-caption text-muted-foreground">
                  無符合條件的訂單
                </td>
              </tr>
            : orderRows.map((row) => (
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
