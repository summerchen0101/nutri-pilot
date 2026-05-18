'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type DailyGmvPoint = { day: string; gmv: number };

const CHART_MARGIN = { left: 4, right: 16, bottom: 0, top: 8 };

interface AdminDailyGmvChartProps {
  readonly points: DailyGmvPoint[];
}

export function AdminDailyGmvChart({ points }: AdminDailyGmvChartProps) {
  if (!points.length) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border text-caption text-muted-foreground">
        尚無已付款資料
      </div>
    );
  }

  const data = points.map((p) => ({
    ...p,
    label: formatDayZh(p.day),
    gmvK: Number(p.gmv) / 1000,
  }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid
            stroke="var(--color-border-tertiary)"
            strokeDasharray="3 6"
          />
          <XAxis dataKey="label" hide tickMargin={8} />
          <YAxis
            width={52}
            tickFormatter={(v: number) => `${v}k`}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '10px',
              border: `1px solid var(--hairline-border-shorthand, var(--color-border-tertiary))`,
              background: 'var(--color-background-primary)',
              fontSize: '13px',
            }}
            formatter={(value) =>
            typeof value !== 'undefined' && typeof value !== 'object' ?
              [
                `NT$ ${Math.round(Number(value) * 1000).toLocaleString('zh-TW')}`,
                'GMV',
              ]
            : ['', '']
          }
            labelFormatter={(_, payload) =>
              payload[0]?.payload?.day ?
                `${formatDayZhFull(payload[0].payload.day)}`
              : ''
            }
          />
          <Line
            type="monotone"
            dataKey="gmvK"
            stroke="#4C956C"
            strokeWidth={2}
            dot={false}
            name="GMV"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatDayZh(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number);
  if (!y || !m || !d) return isoDay.slice(5);
  return `${m}/${d}`;
}

function formatDayZhFull(isoDay: string): string {
  try {
    return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString('zh-TW', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDay;
  }
}
