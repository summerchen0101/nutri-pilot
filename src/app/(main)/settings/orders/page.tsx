import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ContinueOrderPaymentButton } from '@/app/(main)/settings/orders/_components/continue-order-payment-button';
import { memberOrderStatusLabel } from '@/app/(main)/settings/_lib/member-order-status-label';
import { canContinueOrderPayment } from '@/lib/shop/can-continue-order-payment';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { getCachedAuthContext } from '@/lib/auth';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';
import { cn } from '@/lib/utils/cn';

function formatDt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function SettingsOrdersPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const { data: rows, error } = await supabase
    .from('orders')
    .select('id, public_order_no, status, total, created_at, checkout_snapshot')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const list = rows ?? [];

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        title="我的訂單"
        leading={<HeaderBackButton />}
        spacing="compact"
      />
      <p className="text-caption leading-relaxed text-muted-foreground">
        訂單成立與付款通知以系統紀錄為準；物流進度依各子訂單更新。
      </p>
      {list.length === 0 ? (
        <div className="rounded-xl border-hairline border-border bg-card p-6 text-center text-body text-muted-foreground">
          尚無訂單
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((row) => (
            <li key={row.id}>
              <div className="rounded-xl border-hairline border-border bg-card">
                <Link
                  href={`/settings/orders/${row.id}`}
                  className={cn(
                    'block px-3 py-3 transition-colors hover:border-[#4C956C]/40',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-caption text-foreground">
                      {row.public_order_no ?? row.id.slice(0, 8)}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {formatDt(row.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-body font-medium text-foreground">
                      NT${' '}
                      {Number(row.total).toLocaleString('zh-TW', {
                        minimumFractionDigits: 0,
                      })}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-caption text-muted-foreground">
                      {memberOrderStatusLabel(row.status)}
                    </span>
                  </div>
                </Link>
                {canContinueOrderPayment(row.status, row.checkout_snapshot) ?
                  <div className="border-t-hairline border-border px-3 py-3">
                    <ContinueOrderPaymentButton orderId={row.id} />
                  </div>
                : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
