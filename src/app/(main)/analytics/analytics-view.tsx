'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  addCalendarDaysISO,
  iterateISODatesInclusive,
} from '@/lib/onboarding/date';
import { cn } from '@/lib/utils/cn';

export type AnalyticsPeriod = 'week' | 'month' | 'all';

export type WeeklyInsightPayload = {
  createdAt: string;
  items: { type: 'positive' | 'warning' | 'info'; text: string }[];
};

export type AnalyticsViewProps = {
  todayIso: string;
  planStartIso: string;
  nutritionByDate: Record<
    string,
    { kcal: number; carbG: number; proteinG: number; fatG: number }
  >;
  weightByDate: Record<string, number>;
  dailyCalTarget: number | null;
  macroPct: { carb: number; protein: number; fat: number };
  weeklyInsight: WeeklyInsightPayload | null;
};

function periodBounds(
  period: AnalyticsPeriod,
  planStart: string,
  today: string,
): { start: string; end: string } {
  let start =
    period === 'week' ? addCalendarDaysISO(today, -6)
    : period === 'month' ? addCalendarDaysISO(today, -29)
    : planStart;

  if (start < planStart) start = planStart;
  let end = today;
  if (start > end) start = end;
  return { start, end };
}

function macroTargetsFromGoal(
  dailyCal: number,
  pct: { carb: number; protein: number; fat: number },
): { carb: number; protein: number; fat: number } {
  if (!Number.isFinite(dailyCal) || dailyCal <= 0) {
    return { carb: 0, protein: 0, fat: 0 };
  }
  return {
    carb: (dailyCal * (pct.carb / 100)) / 4,
    protein: (dailyCal * (pct.protein / 100)) / 4,
    fat: (dailyCal * (pct.fat / 100)) / 9,
  };
}

function shortTickLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
}

function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-Hant', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AnalyticsView({
  todayIso,
  planStartIso,
  nutritionByDate,
  weightByDate,
  dailyCalTarget,
  macroPct,
  weeklyInsight,
}: AnalyticsViewProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');

  const { start, end } = useMemo(
    () => periodBounds(period, planStartIso, todayIso),
    [period, planStartIso, todayIso],
  );

  const dateList = useMemo(() => iterateISODatesInclusive(start, end), [start, end]);

  const calorieRows = useMemo(() => {
    return dateList.map((d) => ({
      iso: d,
      label: shortTickLabel(d),
      kcal: Math.round(nutritionByDate[d]?.kcal ?? 0),
    }));
  }, [dateList, nutritionByDate]);

  const weightRows = useMemo(() => {
    const rows: { iso: string; label: string; kg: number }[] = [];
    for (const d of dateList) {
      const w = weightByDate[d];
      if (w != null && Number.isFinite(w)) {
        rows.push({ iso: d, label: shortTickLabel(d), kg: w });
      }
    }
    return rows;
  }, [dateList, weightByDate]);

  const radarRow = useMemo(() => {
    if (dailyCalTarget == null || dailyCalTarget <= 0) return null;

    const tgt = macroTargetsFromGoal(dailyCalTarget, macroPct);
    const nDays = dateList.length;
    if (!nDays) return null;

    let sumCarb = 0;
    let sumProtein = 0;
    let sumFat = 0;
    for (const d of dateList) {
      const n = nutritionByDate[d];
      if (n) {
        sumCarb += n.carbG;
        sumProtein += n.proteinG;
        sumFat += n.fatG;
      }
    }

    const cap = (sum: number, goalPerDay: number): number => {
      const g = goalPerDay * nDays;
      return g > 0 ? Math.min(150, (sum / g) * 100) : 0;
    };

    return [
      {
        nutrient: '碳水',
        pct: Math.round(cap(sumCarb, tgt.carb)),
      },
      {
        nutrient: '蛋白質',
        pct: Math.round(cap(sumProtein, tgt.protein)),
      },
      {
        nutrient: '脂肪',
        pct: Math.round(cap(sumFat, tgt.fat)),
      },
    ];
  }, [dailyCalTarget, macroPct, dateList, nutritionByDate]);

  const xAxisInterval = useMemo(() => {
    const n = dateList.length;
    if (n <= 8) return 0;
    if (n <= 16) return 1;
    return Math.max(1, Math.floor(n / 8));
  }, [dateList.length]);

  const chartMargin = { top: 4, right: 8, left: -18, bottom: 4 };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-medium text-[#1E212B]">數據分析</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          追蹤體重與飲食趨勢
        </p>
      </header>

      <div
        className="flex rounded-[10px] border-[0.5px] border-border bg-secondary/40 p-1"
        role="tablist"
        aria-label="資料區間"
      >
        {(
          [
            { id: 'week' as const, label: '本週' },
            { id: 'month' as const, label: '本月' },
            { id: 'all' as const, label: '全程' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={period === t.id}
            onClick={() => setPeriod(t.id)}
            className={cn(
              'flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors',
              period === t.id ?
                'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
        <p className="text-[15px] font-medium text-foreground">體重趨勢</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          單位 · kg
        </p>
        <div className="mt-3 h-[220px] w-full">
          {weightRows.length === 0 ? (
            <p className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
              此區間尚無體重紀錄
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightRows} margin={chartMargin}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval={xAxisInterval}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  width={40}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  cursor={{ stroke: '#4C956C', strokeWidth: 1 }}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 10,
                    border: '0.5px solid hsl(var(--border))',
                  }}
                  formatter={(v) => [`${v ?? '—'} kg`, '體重']}
                  labelFormatter={(label) => String(label)}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="#4C956C"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#4C956C' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
        <p className="text-[15px] font-medium text-foreground">每日熱量</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          依紀錄加總 · kcal
        </p>
        <div className="mt-3 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={calorieRows} margin={chartMargin}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval={xAxisInterval}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                width={40}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 10,
                  border: '0.5px solid hsl(var(--border))',
                }}
                formatter={(v) => [`${v ?? '—'} kcal`, '熱量']}
              />
              <Bar dataKey="kcal" fill="#4C956C" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
        <p className="text-[15px] font-medium text-foreground">營養素達成率</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          區間內總量 ÷（每日目標 × 天數），100% 為剛好達標
        </p>
        <div className="mt-3 h-[240px] w-full">
          {!radarRow ? (
            <p className="flex h-full items-center justify-center px-4 text-center text-[13px] text-muted-foreground">
              尚未設定每日熱量目標，完成飲控目標後會顯示達成率
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="52%" outerRadius="72%" data={radarRow}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="nutrient"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 150]}
                  tick={{ fontSize: 10 }}
                  tickCount={4}
                />
                <Radar
                  name="達成率"
                  dataKey="pct"
                  stroke="#4C956C"
                  fill="#4C956C"
                  fillOpacity={0.35}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 10,
                    border: '0.5px solid hsl(var(--border))',
                  }}
                  formatter={(v) => [`${v ?? '—'}%`, '達成率']}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-xl border-[0.5px] border-[#B5D4F4] bg-[#E6F1FB] p-3.5">
        <p className="text-[11px] font-medium text-[#378ADD]">AI 週報洞察</p>
        {!weeklyInsight?.items?.length ? (
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            尚無週報。系統會在週日自動產生洞察摘要；若有新報告會顯示於此。
          </p>
        ) : (
          <>
            <p className="mt-1 text-[11px] text-muted-foreground">
              最新 · {formatCreatedAt(weeklyInsight.createdAt)}
            </p>
            <ul className="mt-3 space-y-2.5">
              {weeklyInsight.items.map((row, idx) => (
                <li
                  key={`${idx}-${row.text.slice(0, 12)}`}
                  className="flex gap-2 text-[13px] leading-relaxed text-foreground"
                >
                  <span
                    className={cn(
                      'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                      row.type === 'positive' && 'bg-[#4C956C]',
                      row.type === 'warning' && 'bg-[#EF9F27]',
                      row.type === 'info' && 'bg-[#378ADD]',
                    )}
                    aria-hidden
                  />
                  <span>{row.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
