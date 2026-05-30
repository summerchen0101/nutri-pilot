import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LogHistoryDaySummary } from '@/app/(main)/log/_components/log-history-day-summary';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getCachedAuthContext } from '@/lib/auth';
import { buildLogHistoryDayRows } from '@/lib/log/build-log-history-summaries';
import { formatLogDateHeading } from '@/lib/log/log-date-label';
import { todayLocalISODate } from '@/lib/onboarding/date';

function historyRowHref(
  date: string,
  mode: 'today' | 'recent_editable' | 'readonly',
): string {
  if (mode === 'today') return '/log';
  if (mode === 'recent_editable') {
    return `/log?date=${encodeURIComponent(date)}`;
  }
  return `/log/history/${date}`;
}

function historyRowCtaLabel(
  mode: 'today' | 'recent_editable' | 'readonly',
): string {
  if (mode === 'today') return '今日紀錄';
  if (mode === 'recent_editable') return '修改';
  return '查看';
}

export default async function LogHistoryPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const today = todayLocalISODate();

  const [
    { data: goal, error: goalErr },
    { data: foodRows, error: foodErr },
    { data: activityRows, error: actErr },
    { data: vitalRows, error: vitalErr },
  ] = await Promise.all([
      supabase
        .from('user_goals')
        .select('daily_cal_target')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('food_logs')
        .select(
          `
        date,
        meal_type,
        food_log_items ( calories, carb_g, protein_g, fat_g )
      `,
        )
        .eq('user_id', user.id)
        .lte('date', today),
      supabase
        .from('activity_logs')
        .select('logged_date, activity_type, duration_minutes, calories_est')
        .eq('user_id', user.id)
        .lte('logged_date', today),
      supabase
        .from('vital_logs')
        .select('date, weight_kg, water_ml, sleep_hours')
        .eq('user_id', user.id)
        .lte('date', today),
    ]);

  if (goalErr) throw new Error(goalErr.message);
  if (foodErr) throw new Error(foodErr.message);
  if (actErr) throw new Error(actErr.message);
  if (vitalErr) throw new Error(vitalErr.message);

  const dailyCalTarget = goal?.daily_cal_target ?? null;

  const rows = buildLogHistoryDayRows({
    foodRows: foodRows ?? [],
    activityRows: activityRows ?? [],
    vitalRows: vitalRows ?? [],
    todayIso: today,
  });

  return (
    <div className="space-y-3">
      <StickyPageHeader
        leading={<HeaderBackButton />}
        title="過往紀錄"
        spacing="compact"
      />
      <p className="text-caption text-muted-foreground">
        僅能修改今日與近 3 日紀錄；更早日期僅供查看。
      </p>

      {rows.length === 0 ? (
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="space-y-2 py-6">
            <p className="text-[13px] text-foreground">尚無過往紀錄。</p>
            <Link
              href="/log"
              className="inline-flex items-center rounded-full bg-card px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              前往每日紀錄
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => {
            const href = historyRowHref(row.date, row.mode);
            const cta = historyRowCtaLabel(row.mode);
            return (
              <Card key={row.date} className="min-w-0 overflow-hidden">
                <div className="flex min-h-[44px] items-center gap-2 pr-2">
                  <Link
                    href={href}
                    className="min-w-0 flex-1 px-3.5 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[15px] font-medium leading-normal text-foreground">
                        {formatLogDateHeading(row.date, today)}
                      </span>
                      <LogHistoryDaySummary
                        row={row}
                        dailyCalTarget={dailyCalTarget}
                      />
                    </div>
                  </Link>
                  <Link
                    href={href}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-[10px] border-hairline border-border bg-transparent px-4 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {cta}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
