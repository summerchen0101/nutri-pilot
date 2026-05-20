import Link from 'next/link';
import { redirect } from 'next/navigation';

import { parseAdminReportRange } from '@/lib/admin/report-range';
import { getAdminRole, staffCan } from '@/lib/admin';
import { buttonVisualClassName } from '@/components/ui/button-visual';
import { createClient } from '@/lib/supabase/server';

const PAGE_SIZE = 300;

export default async function AdminFinancePaymentsPage({
  searchParams,
}: Readonly<{
  searchParams: Record<string, string | string[] | undefined>;
}>) {
  const role = await getAdminRole();
  if (!staffCan(role, 'analytics.finance')) {
    redirect('/admin/dashboard');
  }

  const startRaw =
    typeof searchParams.start === 'string' ? searchParams.start : undefined;
  const endRaw =
    typeof searchParams.end === 'string' ? searchParams.end : undefined;
  const range = parseAdminReportRange({ start: startRaw, end: endRaw });

  const orderParam =
    typeof searchParams.order === 'string' ? searchParams.order.trim() : undefined;

  const supabase = createClient();
  let query = supabase
    .from('orders')
    .select(
      `
      id,
      public_order_no,
      merchant_order_no,
      gateway_trade_no,
      gateway_session_ref,
      payment_gateway,
      status,
      total,
      user_id,
      created_at
    `,
    )
    .gte('created_at', range.startIso)
    .lt('created_at', range.endExclusiveIso)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (orderParam) {
    query = query.or(
      `public_order_no.eq.${orderParam},merchant_order_no.eq.${orderParam}`,
    );
  }

  const { data: rows, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const list = rows ?? [];
  const exportHref = `/admin/finance/payments/export?start=${encodeURIComponent(
    range.startDateStr,
  )}&end=${encodeURIComponent(range.endDateStr)}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/admin/dashboard"
        className="text-caption text-[#4C956C] hover:underline"
      >
        ← 總覽
      </Link>
      <div>
        <h1 className="text-heading-screen text-foreground">金流對帳</h1>
        <p className="mt-1 text-caption text-slate-600">
          訂單付款與藍新欄位摘要（依建立時間 UTC 篩選）。「藍新交易序號」即手冊
          TradeNo。pending 表示 Notify 尚未入帳；完整退款請於藍新後台核對。
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-background p-4"
      >
        <div className="space-y-1">
          <label htmlFor="pay-start" className="text-caption text-slate-600">
            起日（UTC）
          </label>
          <input
            id="pay-start"
            type="date"
            name="start"
            defaultValue={range.startDateStr}
            className="flex h-11 rounded-[10px] border border-border bg-background px-3 text-body"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="pay-end" className="text-caption text-slate-600">
            迄日（UTC）
          </label>
          <input
            id="pay-end"
            type="date"
            name="end"
            defaultValue={range.endDateStr}
            className="flex h-11 rounded-[10px] border border-border bg-background px-3 text-body"
          />
        </div>
        <button type="submit" className={buttonVisualClassName({ variant: 'default', size: 'sm' })}>
          套用
        </button>
        <a
          href={exportHref}
          className={buttonVisualClassName({ variant: 'outline', size: 'sm' })}
        >
          下載 CSV
        </a>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full border-collapse text-left text-body">
          <thead className="bg-secondary text-caption text-slate-600">
            <tr>
              <th className="border-b border-border px-3 py-2">建立時間</th>
              <th className="border-b border-border px-3 py-2">對外編號</th>
              <th className="border-b border-border px-3 py-2">藍新商店訂單號</th>
              <th className="border-b border-border px-3 py-2">藍新交易序號</th>
              <th className="border-b border-border px-3 py-2">閘道</th>
              <th className="border-b border-border px-3 py-2">狀態</th>
              <th className="border-b border-border px-3 py-2 text-end">總額</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr
                key={r.id}
                className={
                  r.status === 'pending' ?
                    'bg-amber-50/80 odd:bg-amber-50/80 even:bg-amber-50/60'
                  : 'odd:bg-background even:bg-secondary/40'
                }
              >
                <td className="border-b border-border px-3 py-2 text-caption whitespace-nowrap">
                  {r.created_at ?
                    new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')
                  : '—'}
                </td>
                <td className="border-b border-border px-3 py-2 font-mono text-caption">
                  <Link
                    href={`/admin/orders/${r.id}`}
                    className="text-[#4C956C] hover:underline"
                  >
                    {r.public_order_no ?? r.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="border-b border-border px-3 py-2 font-mono text-caption">
                  {r.merchant_order_no ?? '—'}
                </td>
                <td className="border-b border-border px-3 py-2 font-mono text-caption">
                  {r.gateway_trade_no ?? '—'}
                </td>
                <td className="border-b border-border px-3 py-2 text-caption">
                  {r.payment_gateway}
                </td>
                <td className="border-b border-border px-3 py-2 text-caption">
                  {r.status === 'pending' ?
                    <span className="font-medium text-amber-800">pending（未入帳）</span>
                  : r.status}
                </td>
                <td className="border-b border-border px-3 py-2 text-end tabular-nums">
                  {Number(r.total).toLocaleString('zh-TW')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length >= PAGE_SIZE ? (
        <p className="text-caption text-amber-700">
          僅顯示前 {PAGE_SIZE} 筆；請縮小日期區間或使用 CSV 匯出完整區間（上限 5000 筆）。
        </p>
      ) : null}
    </div>
  );
}
