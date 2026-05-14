import Link from 'next/link';
import { redirect } from 'next/navigation';

import { labelShopPointReason } from '@/app/(main)/settings/_lib/point-ledger-labels';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { PageHeader } from '@/components/layout/page-header';
import { getCachedAuthContext } from '@/lib/auth';
import type { Tables } from '@/types/supabase';

function formatDt(iso: string): string {
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

export default async function SettingsPointsHistoryPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const { data: rows, error } = await supabase
    .from('user_shop_point_ledger')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const list = (rows ?? []) as Tables<'user_shop_point_ledger'>[];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="點數紀錄" leading={<HeaderBackButton />} />
      <p className="text-caption leading-relaxed text-muted-foreground">
        1 點可折抵 1 元商城消費。異動原因與餘額僅供參考，以正式方案條款與系統為準。
      </p>
      {list.length === 0 ? (
        <div className="rounded-xl border-hairline border-border bg-card p-6 text-center text-body text-muted-foreground">
          尚無點數異動紀錄
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border-hairline border-border bg-card px-3 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={
                    row.delta >= 0 ? 'text-body font-medium text-primary' : 'text-body font-medium text-destructive'
                  }>
                  {row.delta >= 0 ? '+' : ''}
                  {row.delta.toLocaleString()} 點
                </span>
                <span className="text-caption text-muted-foreground">{formatDt(row.created_at)}</span>
              </div>
              <p className="mt-1 text-caption text-neutral-text-tertiary">
                {labelShopPointReason(row.reason)} · 餘額 {row.balance_after.toLocaleString()} 點
              </p>
              {row.note ? <p className="mt-0.5 text-caption text-muted-foreground">{row.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/settings"
        className="inline-flex min-h-11 items-center justify-center text-caption font-medium text-primary underline-offset-2 hover:underline">
        返回設定
      </Link>
    </div>
  );
}
