'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  applySwapAlternativeAction,
  swapMealItemAction,
  type SwapAlternative,
} from '@/app/(main)/plan/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  copyMealToLog,
  markMealModifiedPending,
  markMealSkipped,
} from '@/lib/plan/checkin';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { todayLocalISODate } from '@/lib/onboarding/date';
import type { Database } from '@/types/supabase';

type DietPlan = Database['public']['Tables']['diet_plans']['Row'];

export interface PlanMealItem {
  id: string;
  name: string;
  quantity_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sodium_mg?: number | null;
}

export interface PlanMeal {
  id: string;
  type: string;
  scheduled_at: string | null;
  is_checked_in: boolean | null;
  checked_in_at: string | null;
  checkin_type: string | null;
  total_calories: number | null;
  meal_items: PlanMealItem[] | null;
}

export interface PlanMenuSnapshot {
  id: string;
  date: string;
  status: string;
  total_calories: number | null;
  completion_pct: number | null;
  is_completed: boolean | null;
  meals: PlanMeal[] | null;
}

const MEAL_LABEL: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

interface PlanViewProps {
  plan: DietPlan;
  windowDates: string[];
  initialMenus: PlanMenuSnapshot[];
  dailyCalTarget: number | null;
  avoidFoods: string[];
  progress: {
    totalPlanDays: number;
    completedDays: number;
    remainingDays: number;
    ratePct: number;
  };
}

function weekdayZhShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return '';
  return ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()] ?? '';
}

/** 打卡後 UI：略過／照吃／調整完成／尚須至紀錄頁／未打卡 */
function checkInVisualState(meal: PlanMeal): {
  kind: 'skipped' | 'exact' | 'modified_done' | 'modified_pending' | 'open';
} {
  if (meal.checkin_type === 'skipped') return { kind: 'skipped' };
  if (meal.is_checked_in && meal.checkin_type === 'modified') {
    return { kind: 'modified_done' };
  }
  if (
    meal.is_checked_in &&
    (meal.checkin_type === 'exact' || meal.checkin_type == null)
  ) {
    return { kind: 'exact' };
  }
  if (!meal.is_checked_in && meal.checkin_type === 'modified') {
    return { kind: 'modified_pending' };
  }
  return { kind: 'open' };
}

export function PlanView({
  plan,
  windowDates,
  initialMenus,
  dailyCalTarget,
  avoidFoods,
  progress,
}: PlanViewProps) {
  const router = useRouter();
  const today = todayLocalISODate();

  const defaultDate =
    windowDates.includes(today) ? today : (windowDates[0] ?? today);

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<PlanMealItem | null>(null);
  const [swapMealType, setSwapMealType] = useState<string>('');
  const [alternatives, setAlternatives] = useState<SwapAlternative[] | null>(
    null,
  );
  const [swapErr, setSwapErr] = useState<string | null>(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapApplying, setSwapApplying] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [popoverMealId, setPopoverMealId] = useState<string | null>(null);

  const menusByDate = useMemo(() => {
    const m = new Map<string, PlanMenuSnapshot>();
    for (const row of initialMenus) {
      m.set(row.date, row);
    }
    return m;
  }, [initialMenus]);

  const selectedMenu = menusByDate.get(selectedDate) ?? null;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`daily_menus_plan_${plan.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_menus',
          filter: `plan_id=eq.${plan.id}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [plan.id, router]);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    if (!popoverMealId) return;

    function onDocMouseDown(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const root = el.closest('[data-plan-checkin-root]');
      if (
        root &&
        root.getAttribute('data-meal-id') === popoverMealId
      ) {
        return;
      }
      setPopoverMealId(null);
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [popoverMealId]);

  async function requestMenu() {
    setPendingId('req');
    try {
      const res = await fetch('/api/ai/menu-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, date: selectedDate }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        console.error(j.error ?? res.statusText);
      }
    } finally {
      setPendingId(null);
      router.refresh();
    }
  }

  async function onExactCheckIn(meal: PlanMeal) {
    setPopoverMealId(null);
    setPendingId(meal.id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPendingId(null);
      setToastMsg('請先登入');
      return;
    }
    const r = await copyMealToLog(meal.id, user.id, selectedDate);
    setPendingId(null);
    if (r.error) {
      setToastMsg(r.error);
      return;
    }
    setToastMsg('已記錄，熱量已加入今日統計');
    router.refresh();
  }

  async function onChooseModified(meal: PlanMeal) {
    setPopoverMealId(null);
    setPendingId(meal.id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPendingId(null);
      setToastMsg('請先登入');
      return;
    }
    const r = await markMealModifiedPending(meal.id, user.id);
    setPendingId(null);
    if (r.error) {
      setToastMsg(r.error);
      return;
    }
    router.push(`/log?from_meal_id=${meal.id}`);
  }

  async function onSkipMeal(meal: PlanMeal) {
    setPopoverMealId(null);
    setPendingId(meal.id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPendingId(null);
      setToastMsg('請先登入');
      return;
    }
    const r = await markMealSkipped(meal.id, user.id);
    setPendingId(null);
    if (r.error) {
      setToastMsg(r.error);
      return;
    }
    router.refresh();
  }

  async function runSwap(item: PlanMealItem, mealType: string) {
    setSwapFor(item);
    setSwapMealType(mealType);
    setAlternatives(null);
    setSwapErr(null);
    setSwapLoading(true);
    const r = await swapMealItemAction({
      originalFood: item.name,
      originalCalories: Number(item.calories),
      carb_g: Number(item.carb_g),
      protein_g: Number(item.protein_g),
      fat_g: Number(item.fat_g),
      dietMethod: plan.diet_method,
      avoidFoods,
    });
    setSwapLoading(false);
    if (r.error) {
      setSwapErr(r.error);
      return;
    }
    setAlternatives(r.alternatives ?? null);
  }

  function closeSwap() {
    setSwapFor(null);
    setAlternatives(null);
    setSwapErr(null);
    setSwapApplying(false);
  }

  async function onPickAlternative(alt: SwapAlternative) {
    if (!swapFor || swapApplying) return;
    setSwapApplying(true);
    const fromName = swapFor.name;
    const r = await applySwapAlternativeAction({
      mealItemId: swapFor.id,
      alternative: alt,
    });
    setSwapApplying(false);
    if (r.error) {
      setToastMsg(r.error);
      return;
    }
    closeSwap();
    setToastMsg(`已將「${fromName}」改為「${alt.name}」`);
    router.refresh();
  }

  const rateWidth = Math.min(100, progress.ratePct);

  useEffect(() => {
    const el = document.getElementById(`plan-date-pill-${today}`);
    el?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [today, windowDates]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>計畫進度</CardTitle>
          <CardDescription className="text-[11px] leading-relaxed">
            已完成 {progress.completedDays} / {progress.totalPlanDays} 天 ·
            距離結束約 {progress.remainingDays} 天
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">達成率</p>
              <p className="tabular-nums text-foreground">
                <span className="text-xl font-medium">{progress.ratePct}</span>
                <span className="text-[13px] font-normal text-muted-foreground">
                  %
                </span>
              </p>
            </div>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-secondary">
            <div
              className="h-[5px] rounded-full bg-[#4C956C] transition-all duration-200 ease-out"
              style={{ width: `${rateWidth}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-[15px] font-medium text-foreground">選擇日期</p>
        <div
          className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ msOverflowStyle: 'none' }}
        >
          {windowDates.map((d) => {
            const menu = menusByDate.get(d);
            const done = Boolean(menu?.is_completed);
            const isToday = d === today;
            const active = d === selectedDate;
            const dayNum = Number(d.slice(8, 10));
            const wch = weekdayZhShort(d);
            return (
              <button
                id={isToday ? `plan-date-pill-${today}` : undefined}
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={cn(
                  'flex h-[56px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl border-[0.5px] px-1 py-1.5 transition-colors duration-150',
                  /* 勿用 ring + ring-offset：在深色「今日」pill 上會疊成雙框；選取改為 0.5px 主色邊 */
                  'outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isToday &&
                    'border-transparent bg-[#1E212B] text-white shadow-none',
                  !isToday &&
                    done &&
                    'border-transparent bg-[#E8F5EE] text-[#2D6B4A]',
                  !isToday &&
                    !done &&
                    'border-border bg-[#F7F8F6] text-muted-foreground',
                  active &&
                    !isToday &&
                    'border-[#4C956C] shadow-none',
                )}
              >
                <span className="text-[14px] font-medium tabular-nums leading-none">
                  {Number.isFinite(dayNum) ? dayNum : d.slice(8)}
                </span>
                <span
                  className={cn(
                    'mt-1 text-[11px] leading-none',
                    isToday ? 'text-white/85' : 'text-inherit opacity-90',
                  )}
                >
                  {wch}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>今日菜單</CardTitle>
          {dailyCalTarget != null ? (
            <p className="mt-1 text-[13px] text-muted-foreground">
              熱量目標{' '}
              <span className="text-xl font-medium tabular-nums text-[#1E212B]">
                {dailyCalTarget}
              </span>
              <span className="text-[13px] font-normal text-muted-foreground">
                {' '}
                kcal
              </span>
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedMenu ? (
            <div className="rounded-xl border-[0.5px] border-dashed border-border bg-muted/30 p-6 text-center">
              <p className="text-[13px] text-muted-foreground">
                這一天尚未建立菜單。
              </p>
              <Button
                className="mt-4"
                type="button"
                onClick={() => void requestMenu()}
                disabled={pendingId !== null}
              >
                {pendingId ? '請稍候…' : '生成菜單'}
              </Button>
            </div>
          ) : selectedMenu.status === 'pending' ||
            selectedMenu.status === 'generating' ? (
            <MenuSkeleton />
          ) : selectedMenu.status === 'error' ? (
            <div className="space-y-3 rounded-xl border-[0.5px] border-border bg-[#FCEBEB] p-4">
              <p className="text-[13px] text-destructive">
                菜單生成失敗，請重試。
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void requestMenu()}
                disabled={pendingId !== null}
              >
                重新排入佇列
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {(selectedMenu.meals ?? []).map((meal) => {
                const vis = checkInVisualState(meal);
                const skipped = vis.kind === 'skipped';
                const showSwap = !skipped;

                return (
                  <div
                    key={meal.id}
                    className={cn(
                      'rounded-xl border-[0.5px] border-border bg-card p-4',
                      skipped && 'bg-muted/25',
                    )}
                  >
                    <div
                      className="flex flex-wrap items-center justify-between gap-2.5"
                      data-plan-checkin-root
                      data-meal-id={meal.id}
                    >
                      <div
                        className={cn(
                          'flex min-w-0 flex-wrap items-center gap-2',
                          skipped &&
                            'text-[#9298A8] line-through decoration-[#9298A8]',
                        )}
                      >
                        <span className="text-[15px] font-medium">
                          {MEAL_LABEL[meal.type] ?? meal.type}
                        </span>
                        {meal.scheduled_at ? (
                          <span className="text-[13px] text-muted-foreground">
                            {meal.scheduled_at.slice(0, 5)}
                          </span>
                        ) : null}
                      </div>

                      <div className="relative flex shrink-0 items-center gap-2">
                        {vis.kind === 'exact' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#4C956C]" aria-hidden>
                              ✓
                            </span>
                            <Badge variant="success">已記錄</Badge>
                          </div>
                        ) : null}
                        {vis.kind === 'modified_done' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#4C956C]" aria-hidden>
                              ✎
                            </span>
                            <Badge variant="success">已調整記錄</Badge>
                          </div>
                        ) : null}
                        {vis.kind === 'skipped' ? (
                          <div className="flex items-center gap-1.5 text-[#9298A8]">
                            <span aria-hidden>✗</span>
                            <span className="text-[12px]">已跳過</span>
                          </div>
                        ) : null}
                        {vis.kind === 'modified_pending' ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 rounded-lg px-3 text-[12px]"
                            disabled={pendingId !== null}
                            onClick={() =>
                              router.push(`/log?from_meal_id=${meal.id}`)
                            }
                          >
                            繼續調整
                          </Button>
                        ) : null}
                        {vis.kind === 'open' ? (
                          <div className="relative">
                            <Button
                              type="button"
                              variant="ghost"
                              className={cn(
                                'h-8 rounded-lg border-[0.5px] border-border bg-white px-3 text-[12px] font-medium text-muted-foreground shadow-none hover:bg-muted',
                              )}
                              disabled={pendingId !== null}
                              aria-expanded={popoverMealId === meal.id}
                              onClick={() =>
                                setPopoverMealId((id) =>
                                  id === meal.id ? null : meal.id,
                                )
                              }
                            >
                              打卡
                            </Button>
                            {popoverMealId === meal.id ? (
                              <div
                                className="absolute right-0 top-[calc(100%+6px)] z-20 w-[min(100vw-2rem,240px)] overflow-hidden rounded-xl border-[0.5px] border-border bg-[#F7F8F6] p-1.5 shadow-md"
                                role="menu"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={pendingId === meal.id}
                                  onClick={() => void onExactCheckIn(meal)}
                                  className="flex w-full items-center gap-2 rounded-lg bg-[#EBF5EF] px-3 py-2.5 text-left text-[13px] font-medium text-[#234433] transition-opacity hover:opacity-95 disabled:opacity-60"
                                >
                                  <span aria-hidden>✓</span>
                                  照計畫吃了
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={pendingId === meal.id}
                                  onClick={() => void onChooseModified(meal)}
                                  className="mt-1 flex w-full items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-left text-[13px] font-medium text-[#1E212B] transition-colors hover:bg-muted/60 disabled:opacity-60"
                                >
                                  <span aria-hidden>✎</span>
                                  有點不一樣
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={pendingId === meal.id}
                                  onClick={() => void onSkipMeal(meal)}
                                  className="mt-1 flex w-full items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-left text-[13px] font-medium text-[#9298A8] transition-colors hover:bg-muted/60 disabled:opacity-60"
                                >
                                  <span aria-hidden>✗</span>
                                  沒吃這餐
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <ul
                      className={cn(
                        'mt-3 space-y-2.5',
                        skipped &&
                          'text-[#9298A8] line-through decoration-[#9298A8]',
                      )}
                    >
                      {(meal.meal_items ?? []).map((it) => (
                        <li
                          key={it.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-b-[0.5px] border-border pb-2.5 text-[13px] last:border-b-0 last:pb-0"
                        >
                          <span className="min-w-0">
                            <span className="block text-[13px]">{it.name}</span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {it.quantity_g}g · {it.calories} kcal
                            </span>
                          </span>
                          {showSwap ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-7 shrink-0 rounded-md border-[0.5px] border-border px-2.5 text-[12px] font-normal"
                              onClick={() => void runSwap(it, meal.type)}
                            >
                              更換
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {toastMsg ? (
        <div
          className="fixed bottom-6 left-1/2 z-[60] max-w-[min(90vw,320px)] -translate-x-1/2 rounded-xl border-[0.5px] border-border bg-[#1E212B] px-4 py-2.5 text-center text-[13px] text-white shadow-lg"
          role="status"
        >
          {toastMsg}
        </div>
      ) : null}

      {swapFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4">
          <Card className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border-[0.5px] border-border shadow-none">
            <CardHeader>
              <CardTitle>替代食材建議</CardTitle>
              <CardDescription>
                原：{swapFor.name}（{MEAL_LABEL[swapMealType] ?? swapMealType}）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {swapLoading ? (
                <p className="text-[13px] text-muted-foreground">分析中…</p>
              ) : swapErr ? (
                <p className="text-[13px] text-destructive">{swapErr}</p>
              ) : alternatives?.length ? (
                <ul className="space-y-2.5">
                  {alternatives.map((a, i) => (
                    <li key={i} className="list-none">
                      <button
                        type="button"
                        disabled={swapApplying}
                        onClick={() => void onPickAlternative(a)}
                        className={cn(
                          'w-full rounded-xl border-[0.5px] border-border bg-secondary p-3 text-left text-[13px] transition-colors',
                          'hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'disabled:pointer-events-none disabled:opacity-60',
                        )}
                        aria-label={`以「${a.name}」取代`}
                      >
                        <p className="font-medium text-foreground">{a.name}</p>
                        <p className="mt-1 text-muted-foreground">
                          {a.quantity_g}g · {a.calories} kcal · C{a.carb_g} /
                          P{a.protein_g} / F{a.fat_g}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {a.reason}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground">無結果</p>
              )}
              {swapApplying ? (
                <p className="text-[13px] text-muted-foreground">套用中…</p>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={closeSwap}
                disabled={swapApplying}
              >
                關閉
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-1/3 rounded-[10px] bg-secondary" />
      <div className="h-24 rounded-xl bg-secondary" />
      <div className="h-24 rounded-xl bg-secondary" />
      <p className="text-center text-[11px] text-muted-foreground">
        AI 正在生成菜單…（完成後會自動更新）
      </p>
    </div>
  );
}
