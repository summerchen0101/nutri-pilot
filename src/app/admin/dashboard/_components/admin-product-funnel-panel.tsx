'use client';

import { useMemo } from 'react';

export type FunnelRow = {
  readonly event_type: string;
  readonly funnel_count: number;
};

interface AdminProductFunnelPanelProps {
  readonly rows: FunnelRow[];
  readonly title?: string;
  readonly emptyHint?: string;
}

const FUNNEL_STAGE_ORDER = [
  'impression',
  'click',
  'add_to_cart',
  'purchase',
] as const;

const LABEL: Record<(typeof FUNNEL_STAGE_ORDER)[number], string> = {
  impression: '曝光（列表可見）',
  click: '進入詳情',
  add_to_cart: '加入購物車',
  purchase: '完成購買',
};

export function AdminProductFunnelPanel({
  rows,
  title = '商品轉換漏斗（過去 30 日）',
  emptyHint = '尚無商城埋點資料；開始累積事件後將顯示各階段人數。',
}: AdminProductFunnelPanelProps) {
  const mapped = useMemo(() => {
    const byType = Object.fromEntries(
      rows.map((r) => [r.event_type, r.funnel_count]),
    );

    let maxCount = 0;
    FUNNEL_STAGE_ORDER.forEach((k) => {
      const c = byType[k] ?? 0;
      if (c > maxCount) maxCount = c;
    });

    return FUNNEL_STAGE_ORDER.map((k) => ({
      key: k,
      label: LABEL[k],
      count: Number(byType[k] ?? 0),
      widthPct: maxCount > 0 ? (Number(byType[k] ?? 0) / maxCount) * 100 : 0,
    }));
  }, [rows]);

  const impressions = mapped[0]?.count ?? 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4">
      <h2 className="text-heading-section text-foreground">{title}</h2>
      {!rows.length ?
        <p className="text-caption text-muted-foreground">{emptyHint}</p>
      : <dl className="space-y-2.5 pt-1">
          {mapped.map((row, idx) => {
            const prev = mapped[idx - 1];
            let rateVsPrev: number | null = null;
            if (prev != null && prev.count > 0) {
              rateVsPrev = (row.count / prev.count) * 100;
            } else if (idx === 0 && impressions > 0) {
              rateVsPrev = 100;
            }

            const rateVsImpressions =
              impressions > 0 ? (row.count / impressions) * 100 : null;

            return (
              <div key={row.key} className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <dt className="text-body text-foreground">{row.label}</dt>
                  <dd className="tabular-nums text-body font-medium text-foreground">
                    {row.count.toLocaleString('zh-TW')}
                    {rateVsPrev != null ?
                      <span className="text-caption font-normal text-muted-foreground">{` （相對前一階段 ${rateVsPrev.toFixed(1)}％）`}</span>
                    : null}
                    {idx > 0 && rateVsImpressions != null ?
                      <span className="text-caption font-normal text-muted-foreground">{` · 對曝光 ${rateVsImpressions.toFixed(1)}％`}</span>
                    : null}
                  </dd>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${row.widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </dl>
      }
    </div>
  );
}
