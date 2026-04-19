'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  checkInMeal,
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
}

export interface PlanMeal {
  id: string;
  type: string;
  scheduled_at: string | null;
  is_checked_in: boolean | null;
  checked_in_at: string | null;
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

function CheckIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={cn('h-4 w-4', props.className)}
      aria-hidden
    >
      <path d="M6 12l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

  async function onCheckIn(mealId: string) {
    setPendingId(mealId);
    const r = await checkInMeal(mealId);
    setPendingId(null);
    if (r.error) console.error(r.error);
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
  }

  const rateWidth = Math.min(100, progress.ratePct);

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
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {windowDates.map((d) => {
            const menu = menusByDate.get(d);
            const done = Boolean(menu?.is_completed);
            const isToday = d === today;
            const active = d === selectedDate;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={cn(
                  'shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-medium transition-colors duration-150',
                  active && isToday && 'border-white/70',
                  active && !isToday && 'border-[#4C956C]',
                  !active && 'border-transparent',
                  isToday
                    ? 'bg-[#4C956C] text-white'
                    : done
                      ? 'bg-[#E8F5EE] text-[#2D6B4A]'
                      : 'bg-secondary text-muted-foreground',
                )}
              >
                {d.slice(5)}
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{selectedDate} 的菜單</CardTitle>
          {dailyCalTarget != null ? (
            <p className="text-[11px] text-muted-foreground">
              每日熱量目標{' '}
              <span className="tabular-nums text-foreground">
                <span className="text-xl font-medium">{dailyCalTarget}</span>
                <span className="text-[13px] font-normal text-muted-foreground">
                  {' '}
                  kcal
                </span>
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
              {(selectedMenu.meals ?? []).map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-xl border-[0.5px] border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-[15px] font-medium text-foreground">
                        {MEAL_LABEL[meal.type] ?? meal.type}
                      </span>
                      {meal.scheduled_at ? (
                        <Badge variant="outline" className="font-normal">
                          {meal.scheduled_at.slice(0, 5)}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {meal.is_checked_in ? '已打卡' : '打卡'}
                      </span>
                      <button
                        type="button"
                        disabled={pendingId === meal.id}
                        aria-pressed={Boolean(meal.is_checked_in)}
                        aria-label={
                          meal.is_checked_in ? '已完成打卡' : '標記此餐為已打卡'
                        }
                        onClick={() => void onCheckIn(meal.id)}
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[0.5px] transition-colors duration-150 disabled:opacity-50',
                          meal.is_checked_in
                            ? 'border-[#4C956C] bg-[#E8F5EE] text-[#4C956C]'
                            : 'border-border bg-card text-foreground hover:bg-muted',
                        )}
                      >
                        {meal.is_checked_in ? <CheckIcon /> : null}
                      </button>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {(meal.meal_items ?? []).map((it) => (
                      <li
                        key={it.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b-[0.5px] border-border pb-2.5 text-[13px] text-foreground last:border-b-0 last:pb-0"
                      >
                        <span className="min-w-0">
                          <span className="text-[13px]">{it.name}</span>{' '}
                          <span className="text-[11px] text-muted-foreground">
                            {it.quantity_g}g · {it.calories} kcal
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 shrink-0 px-2 text-[11px] font-normal"
                          onClick={() => void runSwap(it, meal.type)}
                        >
                          換食材
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {swapFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4">
          <Card className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border-[0.5px] border-border shadow-none">
            <CardHeader>
              <CardTitle>替代食材建議</CardTitle>
              <CardDescription>
                原：{swapFor.name}（{swapMealType}）
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
                    <li
                      key={i}
                      className="rounded-xl border-[0.5px] border-border bg-secondary p-3 text-[13px]"
                    >
                      <p className="font-medium text-foreground">{a.name}</p>
                      <p className="mt-1 text-muted-foreground">
                        {a.quantity_g}g · {a.calories} kcal · C{a.carb_g} /
                        P{a.protein_g} / F{a.fat_g}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {a.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground">無結果</p>
              )}
              <Button type="button" variant="ghost" onClick={closeSwap}>
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
