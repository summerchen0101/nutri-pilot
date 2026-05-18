import Link from 'next/link';

import { parseAdminReportRange } from '@/lib/admin/report-range';
import { getAdminRole, staffCan } from '@/lib/admin';
import { buttonVisualClassName } from '@/components/ui/button-visual';

export default async function AdminReportsPage({
  searchParams,
}: Readonly<{
  searchParams: Record<string, string | string[] | undefined>;
}>) {
  const role = await getAdminRole();
  if (role === 'cs') {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <p className="text-body text-muted-foreground">此區域僅限編輯與超級管理員。</p>
        <Link href="/admin/orders" className="text-caption text-[#4C956C] hover:underline">
          返回訂單
        </Link>
      </div>
    );
  }

  const startRaw =
    typeof searchParams.start === 'string' ? searchParams.start : undefined;
  const endRaw =
    typeof searchParams.end === 'string' ? searchParams.end : undefined;
  const range = parseAdminReportRange({ start: startRaw, end: endRaw });

  const q = `start=${encodeURIComponent(range.startDateStr)}&end=${encodeURIComponent(range.endDateStr)}`;
  const canFinance = staffCan(role, 'analytics.finance');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/admin/dashboard" className="text-caption text-[#4C956C] hover:underline">
        ← 總覽
      </Link>
      <div>
        <h1 className="text-heading-screen text-foreground">報表匯出</h1>
        <p className="mt-1 text-caption text-slate-600">
          以 UTC 日期篩選區間後下載 CSV（Excel 可開啟 UTF-8）。
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-background p-4"
      >
        <div className="space-y-1">
          <label htmlFor="rep-start" className="text-caption text-slate-600">
            起日（UTC）
          </label>
          <input
            id="rep-start"
            type="date"
            name="start"
            defaultValue={range.startDateStr}
            className="flex h-11 rounded-[10px] border border-border bg-background px-3 text-body"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="rep-end" className="text-caption text-slate-600">
            迄日（UTC）
          </label>
          <input
            id="rep-end"
            type="date"
            name="end"
            defaultValue={range.endDateStr}
            className="flex h-11 rounded-[10px] border border-border bg-background px-3 text-body"
          />
        </div>
        <button type="submit" className={buttonVisualClassName({ variant: 'default', size: 'sm' })}>
          套用區間
        </button>
      </form>

      <ul className="space-y-4">
        <li className="rounded-xl border border-border bg-background p-4">
          <h2 className="text-heading-section text-foreground">銷售報表（日）</h2>
          <p className="mt-1 text-caption text-slate-600">
            已付款訂單依 UTC 日期聚合：筆數與 GMV。
          </p>
          {canFinance ?
            <a
              href={`/admin/reports/export/sales?${q}`}
              className={`mt-3 inline-flex ${buttonVisualClassName({ variant: 'outline', size: 'sm' })}`}
            >
              下載 sales-by-day.csv
            </a>
          : <p className="mt-3 text-caption text-muted-foreground">僅超級管理員可匯出。</p>}
        </li>
        <li className="rounded-xl border border-border bg-background p-4">
          <h2 className="text-heading-section text-foreground">產品報表（訂單明細）</h2>
          <p className="mt-1 text-caption text-slate-600">
            已付款訂單之品項列：商品／規格／數量／單價／小計。
          </p>
          <a
            href={`/admin/reports/export/order-lines?${q}`}
            className={`mt-3 inline-flex ${buttonVisualClassName({ variant: 'outline', size: 'sm' })}`}
          >
            下載 order-lines.csv
          </a>
        </li>
        <li className="rounded-xl border border-border bg-background p-4">
          <h2 className="text-heading-section text-foreground">金流報表</h2>
          <p className="mt-1 text-caption text-slate-600">
            與「金流對帳」相同欄位；請至該頁檢視列表或匯出。
          </p>
          {canFinance ?
            <Link
              href={`/admin/finance/payments?${q}`}
              className={`mt-3 inline-flex ${buttonVisualClassName({ variant: 'outline', size: 'sm' })}`}
            >
              前往金流對帳
            </Link>
          : <p className="mt-3 text-caption text-muted-foreground">僅超級管理員。</p>}
        </li>
      </ul>
    </div>
  );
}
