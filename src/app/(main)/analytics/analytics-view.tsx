'use client';

import { useMemo, useState } from 'react';
import {
  ChevronUp,
  Dumbbell,
  Scale,
  Sparkles,
  Target,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
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

import { HeaderBackButton } from '@/components/layout/header-back-button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';

import { WeeklyReportShare } from '@/app/(main)/analytics/weekly-report-share';
import { activityTypeLabelZh } from '@/lib/activity/activity-type-labels';
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

export type ActivityByDateEntry = {
  minutes: number;
  kcalEst: number;
};

export type ActivityEventSlice = {
  logged_date: string;
  activity_type: string;
  duration_minutes: number;
};

export type AnalyticsViewProps = {
  todayIso: string;
  planStartIso: string;
  nutritionByDate: Record<
    string,
    { kcal: number; carbG: number; proteinG: number; fatG: number }
  >;
  weightByDate: Record<string, number>;
  activityByDate: Record<string, ActivityByDateEntry>;
  activityEvents: ActivityEventSlice[];
  dailyCalTarget: number | null;
  macroPct: { carb: number; protein: number; fat: number };
  weeklyInsight: WeeklyInsightPayload | null;
  weekShareSummary: {
    rangeLabel: string;
    avgKcal: number;
    weightSummaryLine: string;
    activityMinutesLine: string;
    activityKcalLine: string;
  };
};

function periodBounds(
  period: AnalyticsPeriod,
  planStart: string,
  today: string,
): { start: string; end: string } {
  let start =
    period === "week"
      ? addCalendarDaysISO(today, -6)
      : period === "month"
        ? addCalendarDaysISO(today, -29)
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

function scrollToChart(id: string) {
  const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const analyticsQuickNavButtonClass = cn(
  'inline-flex h-7 shrink-0 items-center gap-0.5 rounded-full border-[0.5px] border-[#4C956C] bg-transparent px-2 text-[12px] font-medium text-[#4C956C]',
  'hover:bg-[#4C956C]/10 hover:text-[#3d7a56]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C]/25',
);

const analyticsQuickAiNavButtonClass = cn(
  'inline-flex h-7 shrink-0 items-center gap-0.5 rounded-full border-[0.5px] border-[#B5D4F4] bg-[#E6F1FB] px-2 text-[12px] font-medium text-[#378ADD]',
  'hover:border-[#378ADD]/70 hover:bg-[#D6EAF9] hover:text-[#2B6CB0]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#378ADD]/25',
);

const analyticsFloatingNavButtonClass = cn(
  'flex h-10 min-w-[2.75rem] shrink-0 items-center justify-center rounded-l-full rounded-r-none border-[0.5px] border-[#4C956C] border-r-0 bg-card pl-2.5 pr-0 text-[#4C956C] shadow-md',
  'hover:bg-[#4C956C]/10 hover:text-[#3d7a56]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C]/25 focus-visible:ring-offset-2',
);

const analyticsFloatingAiNavButtonClass = cn(
  'flex h-10 min-w-[2.75rem] shrink-0 items-center justify-center rounded-l-full rounded-r-none border-[0.5px] border-[#B5D4F4] border-r-0 bg-[#E6F1FB] pl-2.5 pr-0 text-[#378ADD] shadow-md',
  'hover:border-[#378ADD]/70 hover:bg-[#D6EAF9] hover:text-[#2B6CB0]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#378ADD]/25 focus-visible:ring-offset-2',
);

const ANALYTICS_CHART_NAV: {
  chartId: string;
  ariaLabel: string;
  shortLabel: string;
  Icon: LucideIcon;
}[] = [
  {
    chartId: 'analytics-chart-weight',
    ariaLabel: '捲動至：體重趨勢',
    shortLabel: '體重',
    Icon: Scale,
  },
  {
    chartId: 'analytics-chart-calories',
    ariaLabel: '捲動至：每日熱量',
    shortLabel: '熱量',
    Icon: UtensilsCrossed,
  },
  {
    chartId: 'analytics-chart-activity',
    ariaLabel: '捲動至：每日運動時間',
    shortLabel: '運動',
    Icon: Dumbbell,
  },
  {
    chartId: 'analytics-chart-nutrients',
    ariaLabel: '捲動至：營養素達成率',
    shortLabel: '營養素',
    Icon: Target,
  },
];

export function AnalyticsView({
  todayIso,
  planStartIso,
  nutritionByDate,
  weightByDate,
  activityByDate,
  activityEvents,
  dailyCalTarget,
  macroPct,
  weeklyInsight,
  weekShareSummary,
}: AnalyticsViewProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');

  const { start, end } = useMemo(
    () => periodBounds(period, planStartIso, todayIso),
    [period, planStartIso, todayIso],
  );

  const dateList = useMemo(
    () => iterateISODatesInclusive(start, end),
    [start, end],
  );

  const calorieRows = useMemo(() => {
    return dateList.map((d) => ({
      iso: d,
      label: shortTickLabel(d),
      kcal: Math.round(nutritionByDate[d]?.kcal ?? 0),
    }));
  }, [dateList, nutritionByDate]);

  const activityMinuteRows = useMemo(() => {
    return dateList.map((d) => ({
      iso: d,
      label: shortTickLabel(d),
      minutes: Math.round(activityByDate[d]?.minutes ?? 0),
    }));
  }, [dateList, activityByDate]);

  const activityKcalRows = useMemo(() => {
    return dateList.map((d) => ({
      iso: d,
      label: shortTickLabel(d),
      kcal: Math.round(activityByDate[d]?.kcalEst ?? 0),
    }));
  }, [dateList, activityByDate]);

  const activityTypeRows = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const ev of activityEvents) {
      if (ev.logged_date < start || ev.logged_date > end) continue;
      const t = ev.activity_type || 'other';
      byType[t] = (byType[t] ?? 0) + (Number(ev.duration_minutes) || 0);
    }
    return Object.entries(byType)
      .filter(([, minutes]) => minutes > 0)
      .map(([typeKey, minutes]) => ({
        label: activityTypeLabelZh(typeKey),
        minutes: Math.round(minutes),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [activityEvents, start, end]);

  const hasActivityMinutesInPeriod = useMemo(
    () => activityMinuteRows.some((r) => r.minutes > 0),
    [activityMinuteRows],
  );

  const hasActivityKcalInPeriod = useMemo(
    () => activityKcalRows.some((r) => r.kcal > 0),
    [activityKcalRows],
  );

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
        nutrient: "碳水",
        pct: Math.round(cap(sumCarb, tgt.carb)),
      },
      {
        nutrient: "蛋白質",
        pct: Math.round(cap(sumProtein, tgt.protein)),
      },
      {
        nutrient: "脂肪",
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
  const typeChartHeight = Math.min(
    320,
    Math.max(200, activityTypeRows.length * 36 + 48),
  );

  return (
    <div className="space-y-3">
      <PageHeader
        leading={<HeaderBackButton />}
        title="數據分析"
        description="查看體重、飲食熱量、營養素達成率與運動紀錄的變化。"
        spacing="compact"
      />

      <SegmentedTabs
        value={period}
        ariaLabel="資料區間"
        onChange={setPeriod}
        options={[
          { id: 'week', label: '本週' },
          { id: 'month', label: '本月' },
          { id: 'all', label: '全程' },
        ]}
      />

      <nav
        id="analytics-quick-nav"
        aria-label="圖表區塊錨點"
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
        <button
          type="button"
          className={analyticsQuickAiNavButtonClass}
          aria-label="捲動至：AI 週報洞察"
          onClick={() => scrollToChart('analytics-weekly-insight')}>
          <Sparkles
            className="h-3 w-3 shrink-0"
            strokeWidth={1.8}
            aria-hidden
          />
          AI 洞察
        </button>
        {ANALYTICS_CHART_NAV.map(({ chartId, ariaLabel, shortLabel, Icon }) => (
          <button
            key={chartId}
            type="button"
            className={analyticsQuickNavButtonClass}
            aria-label={ariaLabel}
            onClick={() => scrollToChart(chartId)}>
            <Icon
              className="h-3 w-3 shrink-0"
              strokeWidth={1.8}
              aria-hidden
            />
            {shortLabel}
          </button>
        ))}
      </nav>

      <nav
        aria-label="圖表快速導覽（浮動）"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2 pr-[max(0px,env(safe-area-inset-right))]">
        <button
          type="button"
          className={analyticsFloatingAiNavButtonClass}
          aria-label="捲動至：AI 週報洞察"
          onClick={() => scrollToChart('analytics-weekly-insight')}>
          <Sparkles className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </button>
        {ANALYTICS_CHART_NAV.map(({ chartId, ariaLabel, Icon }) => (
          <button
            key={chartId}
            type="button"
            className={analyticsFloatingNavButtonClass}
            aria-label={ariaLabel}
            onClick={() => scrollToChart(chartId)}>
            <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
          </button>
        ))}
        <button
          type="button"
          className={analyticsFloatingNavButtonClass}
          aria-label="回到頁面頂端"
          onClick={() => scrollToTop()}>
          <ChevronUp className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </button>
      </nav>

      <SectionCard id="analytics-chart-weight" className="scroll-mt-3">
        <p className="text-[15px] font-medium text-foreground">體重趨勢</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">單位 · kg</p>
        <div className="mt-3 h-[200px] w-full">
          {weightRows.length === 0 ? (
            <div className="h-full">
              <EmptyState message="此區間尚無體重紀錄" />
            </div>
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
                  dot={{ r: 3, fill: "#4C956C" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      <SectionCard id="analytics-chart-calories" className="scroll-mt-3">
        <p className="text-[15px] font-medium text-foreground">每日熱量</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          依紀錄加總 · kcal
        </p>
        <div className="mt-3 h-[200px] w-full">
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
              <Bar
                dataKey="kcal"
                fill="#4C956C"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard id="analytics-chart-activity" className="scroll-mt-3">
        <p className="text-[15px] font-medium text-foreground">每日運動時間</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          依紀錄加總 · 分鐘
        </p>
        <div className="mt-3 h-[200px] w-full">
          {!hasActivityMinutesInPeriod ? (
            <div className="h-full">
              <EmptyState message="此區間尚無運動紀錄" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityMinuteRows} margin={chartMargin}>
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
                  formatter={(v) => [`${v ?? '—'} 分鐘`, '運動']}
                />
                <Bar
                  dataKey="minutes"
                  fill="#4C956C"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-[15px] font-medium text-foreground">每日估計消耗</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          僅加總有填寫估熱的紀錄 · kcal
        </p>
        <div className="mt-3 h-[200px] w-full">
          {!hasActivityKcalInPeriod ? (
            <div className="h-full">
              <EmptyState message="此區間無估熱資料。紀錄運動時可填估計消耗以顯示圖表。" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityKcalRows} margin={chartMargin}>
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
                  formatter={(v) => [`${v ?? '—'} kcal`, '估消耗']}
                />
                <Bar
                  dataKey="kcal"
                  fill="#4C956C"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      <SectionCard>
        <p className="text-[15px] font-medium text-foreground">運動類型分布</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          本區間各類型分鐘數（可多筆同日）
        </p>
        <div className="mt-3 w-full" style={{ height: typeChartHeight }}>
          {activityTypeRows.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <EmptyState message="此區間尚無運動紀錄" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={activityTypeRows}
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="hsl(var(--border))" horizontal />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={88}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 10,
                    border: '0.5px solid hsl(var(--border))',
                  }}
                  formatter={(v) => [`${v ?? '—'} 分鐘`, '時間']}
                />
                <Bar
                  dataKey="minutes"
                  fill="#4C956C"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      <SectionCard id="analytics-chart-nutrients" className="scroll-mt-3">
        <p className="text-[15px] font-medium text-foreground">營養素達成率</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          區間內總量 ÷（每日目標 × 天數），100% 為剛好達標
        </p>
        <div className="mt-3 h-[220px] w-full">
          {!radarRow ? (
            <div className="h-full">
              <EmptyState message="尚未設定每日熱量目標，完成飲控目標後會顯示達成率" />
            </div>
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
      </SectionCard>

      <section
        id="analytics-weekly-insight"
        className="scroll-mt-3 rounded-xl border-[0.5px] border-[#B5D4F4] bg-[#E6F1FB] p-3.5">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles
              className="h-4 w-4 shrink-0 text-[#378ADD]"
              strokeWidth={1.8}
              aria-hidden
            />
            <p className="text-[15px] font-medium text-foreground">AI 週報洞察</p>
          </div>
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
                    aria-label={
                      row.type === "positive"
                        ? `正面：${row.text}`
                        : row.type === "warning"
                          ? `提醒：${row.text}`
                          : `補充：${row.text}`
                    }>
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        row.type === "positive" && "bg-[#4C956C]",
                        row.type === "warning" && "bg-[#EF9F27]",
                        row.type === "info" && "bg-[#378ADD]",
                      )}
                      aria-hidden
                    />
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="mt-4 border-t-[0.5px] border-[#B5D4F4]/60 pt-4">
          <WeeklyReportShare
            rangeLabel={weekShareSummary.rangeLabel}
            avgKcal={weekShareSummary.avgKcal}
            weightSummaryLine={weekShareSummary.weightSummaryLine}
            activityMinutesLine={weekShareSummary.activityMinutesLine}
            activityKcalLine={weekShareSummary.activityKcalLine}
            insightLines={weeklyInsight?.items?.map((i) => i.text) ?? []}
          />
        </div>
      </section>
    </div>
  );
}
