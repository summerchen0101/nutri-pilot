import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminDailyGmvChart } from '@/app/admin/dashboard/_components/admin-daily-gmv-chart';
import type { FunnelRow } from '@/app/admin/dashboard/_components/admin-product-funnel-panel';
import { AdminProductFunnelPanel } from '@/app/admin/dashboard/_components/admin-product-funnel-panel';
import { buttonVisualClassName } from '@/components/ui/button-visual';
import { getAdminRole } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

function utcDateString(daysAgoEnd: Date): string {
  return daysAgoEnd.toISOString().slice(0, 10);
}

function utcMonthStartIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  ).toISOString();
}

function startOfRollingWindow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function aggregateTopProductPurchases(rows: readonly { product_id: string }[]) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.product_id, (counts.get(r.product_id) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

const PAID_QUERY_PAGE_SIZE = 1000;

async function summarizePaidOrdersSince(
  client: ReturnType<typeof createClient>,
  monthStartIso: string,
): Promise<{ orderCount: number; totalGmv: number }> {
  let offset = 0;
  let orderCount = 0;
  let totalGmv = 0;

  for (;;) {
    const end = offset + PAID_QUERY_PAGE_SIZE - 1;

    const { data, error } = await client
      .from('orders')
      .select('total')
      .eq('status', 'paid')
      .gte('created_at', monthStartIso)
      .range(offset, end);

    if (error) throw new Error(error.message);

    const rowCount = data?.length ?? 0;
    orderCount += rowCount;
    for (const r of data ?? []) {
      totalGmv += Number(r.total ?? 0);
    }

    if (rowCount < PAID_QUERY_PAGE_SIZE) break;
    offset += PAID_QUERY_PAGE_SIZE;
  }

  return { orderCount, totalGmv };
}

export default async function AdminDashboardPage() {
  const role = await getAdminRole();
  if (role === 'cs') {
    redirect('/admin/orders');
  }

  const supabase = createClient();

  const monthStartIso = utcMonthStartIso();
  const funnelEndDate = utcDateString(new Date());
  const funnelStartDate = utcDateString(
    new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
  );
  const purchaseAggSinceIso = startOfRollingWindow(30);

  const { count: productCount, error: pErr } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  if (pErr) throw new Error(pErr.message);

  let monthlyPaidOrderCount = 0;
  let monthlyPaidGmv = 0;
  let foodLogEntriesLastWeek = 0;
  let dailyGmvSeries: Array<{ day: string; gmv: number }> = [];
  let funnelRows: FunnelRow[] = [];
  let gmvTrendError: string | null = null;
  let funnelError: string | null = null;

  if (role === 'super_admin') {
    const [
      monthlySummary,
      { data: gmRows, error: gmErr },
      { count: flCount, error: flErr },
    ] = await Promise.all([
      summarizePaidOrdersSince(supabase, monthStartIso),
      supabase.rpc('get_daily_gmv', { p_days: 30 }),
      supabase
        .from('food_logs')
        .select('id', { count: 'exact', head: true })
        .gte('logged_at', startOfRollingWindow(7)),
    ]);

    monthlyPaidOrderCount = monthlySummary.orderCount;
    monthlyPaidGmv = monthlySummary.totalGmv;

    if (gmErr) {
      gmvTrendError = gmErr.message;
    } else {
      dailyGmvSeries =
        gmRows?.map((r: { day: string; gmv: number }) => ({
          day: r.day,
          gmv: Number(r.gmv),
        })) ?? [];
    }

    if (!flErr) {
      foodLogEntriesLastWeek = flCount ?? 0;
    }
  }

  if (role === 'super_admin' || role === 'editor') {
    const { data: fv, error: fe } = await supabase.rpc(
      'get_product_funnel',
      {
        p_product_id: null,
        p_start_date: funnelStartDate,
        p_end_date: funnelEndDate,
      },
    );

    if (fe) {
      funnelError = fe.message;
    } else if (fv) {
      funnelRows = fv.map((r: { event_type: string; funnel_count: number }) => ({
        event_type: String(r.event_type),
        funnel_count: Number(r.funnel_count),
      }));
    }
  }

  let topPurchases: Array<{ rank: number; name: string; count: number }> = [];

  if (role === 'super_admin' || role === 'editor') {
    const { data: pe, error: peErr } = await supabase
      .from('product_events')
      .select('product_id')
      .eq('event_type', 'purchase')
      .gte('created_at', purchaseAggSinceIso);

    if (!peErr && pe?.length) {
      const agg = aggregateTopProductPurchases(pe);
      const ids = agg.map((a) => a[0]).filter(Boolean);
      if (ids.length) {
        const { data: names, error: nErr } = await supabase
          .from('products')
          .select('id, name')
          .in('id', ids);

        if (!nErr && names?.length) {
          const nm = Object.fromEntries(
            names.map((p) => [p.id as string, p.name as string]),
          );
          topPurchases = agg.map(([pid, ct], idx) => ({
            rank: idx + 1,
            name: nm[pid] ?? '(已刪除商品)',
            count: ct,
          }));
        }
      }
    }
  }

  const showFinance = role === 'super_admin';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-heading-screen text-foreground">總覽</h1>
        <p className="mt-1 text-body text-slate-600">
          {showFinance ?
            `含本月已付款摘要、過去 30 日銷售趨勢，以及使用者飲食記錄／商城漏斗。「訂閱／MRR」MVP 未啟用。`
          : '編輯者可檢視商品量、商城漏斗與熱門購買（依埋點 purchase）。'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-caption text-slate-600">商品數</p>
          <p className="mt-1 text-heading-page text-foreground">
            {productCount ?? 0}
          </p>
          <Link
            href="/admin/products"
            className={buttonVisualClassName({
              variant: 'outline',
              size: 'sm',
              className: 'mt-3',
            })}
          >
            管理商品
          </Link>
        </div>

        {showFinance ?
          <>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-caption text-slate-600">本月已付款訂單數</p>
              <p className="mt-1 text-heading-page text-foreground">
                {monthlyPaidOrderCount}
              </p>
              <Link
                href="/admin/orders"
                className={buttonVisualClassName({
                  variant: 'outline',
                  size: 'sm',
                  className: 'mt-3',
                })}
              >
                查看訂單
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-caption text-slate-600">本月 GMV（paid）</p>
              <p className="mt-1 text-heading-page text-foreground">
                NT${' '}
                {monthlyPaidGmv.toLocaleString('zh-TW', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          </>
        : null}
      </div>

      {showFinance ?
        <>
          <div className="space-y-2 rounded-xl border border-border bg-background p-4">
            <h2 className="text-heading-section text-foreground">近 30 日每日 GMV</h2>
            {gmvTrendError ?
              <p className="text-caption text-red-600">{gmvTrendError}</p>
            : <AdminDailyGmvChart points={dailyGmvSeries} />}
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <h2 className="text-heading-section text-foreground">用戶行為摘要</h2>
            <p className="mt-2 text-body text-foreground">
              近 7 日{' '}
              <span className="font-medium tabular-nums">
                {foodLogEntriesLastWeek.toLocaleString('zh-TW')}
              </span>{' '}
              筆飲食記錄（筆數，非不重複用戶；完整活躍度日後可加 RPC）。
            </p>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <h2 className="text-heading-section text-foreground">訂閱／MRR</h2>
            <p className="mt-2 text-caption text-muted-foreground">
              MVP 未接藍新定期定額；此區預留，暫不依賴 subscriptions 表數據。
            </p>
          </div>
        </>
      : null}

      {role === 'super_admin' || role === 'editor' ?
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            {funnelError ?
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-caption text-red-600">{funnelError}</p>
              </div>
            : (
              <AdminProductFunnelPanel rows={funnelRows} />
            )}
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
            <h2 className="text-heading-section text-foreground">
              熱門購買 Top 10（過去 30 日／purchase 埋點）
            </h2>
            {topPurchases.length === 0 ?
              <p className="text-caption text-muted-foreground">
                尚無 purchase 事件時可對照訂單明細報表。
              </p>
            : (
              <ol className="list-decimal space-y-2 pl-5 marker:text-muted-foreground">
                {topPurchases.map((r) => (
                  <li
                    key={`${r.rank}-${r.name}`}
                    className="text-body text-foreground"
                  >
                    <span className="font-medium">{r.name}</span>
                    {' — '}
                    <span className="tabular-nums text-muted-foreground">
                      {r.count.toLocaleString('zh-TW')} 次購買紀錄
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      : null}
    </div>
  );
}
