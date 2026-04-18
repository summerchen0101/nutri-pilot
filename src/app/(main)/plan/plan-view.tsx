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

  return (
    <div className="mt-8 space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">計畫進度</CardTitle>
          <CardDescription>
            已完成 {progress.completedDays} / {progress.totalPlanDays}{' '}
            天 · 預估達成率 {progress.ratePct}% · 距離結束約{' '}
            {progress.remainingDays} 天
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${Math.min(100, progress.ratePct)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">選擇日期</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {windowDates.map((d) => {
            const menu = menusByDate.get(d);
            const done = menu?.is_completed;
            const isToday = d === today;
            const active = d === selectedDate;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : done
                      ? 'bg-emerald-100 text-emerald-900'
                      : isToday
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-slate-100 text-slate-700'
                }`}
              >
                {d.slice(5)}
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedDate} 的菜單
          </CardTitle>
          {dailyCalTarget != null ? (
            <CardDescription>
              每日熱量目標約 {dailyCalTarget} kcal
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedMenu ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-600">
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
            <div className="space-y-3 rounded-lg border border-red-100 bg-red-50 p-4">
              <p className="text-sm text-red-800">
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
            <div className="space-y-6">
              {(selectedMenu.meals ?? []).map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {MEAL_LABEL[meal.type] ?? meal.type}
                      </span>
                      {meal.scheduled_at ? (
                        <Badge variant="outline">
                          {meal.scheduled_at.slice(0, 5)}
                        </Badge>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant={meal.is_checked_in ? 'outline' : 'default'}
                      disabled={pendingId === meal.id}
                      onClick={() => void onCheckIn(meal.id)}
                    >
                      {meal.is_checked_in ? '已打卡' : '打卡'}
                    </Button>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {(meal.meal_items ?? []).map((it) => (
                      <li
                        key={it.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700"
                      >
                        <span>
                          {it.name}{' '}
                          <span className="text-slate-400">
                            {it.quantity_g}g · {it.calories} kcal
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[80vh] w-full max-w-lg overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-base">替代食材建議</CardTitle>
              <CardDescription>
                原：{swapFor.name}（{swapMealType}）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {swapLoading ? (
                <p className="text-sm text-slate-600">分析中…</p>
              ) : swapErr ? (
                <p className="text-sm text-red-600">{swapErr}</p>
              ) : alternatives?.length ? (
                <ul className="space-y-3">
                  {alternatives.map((a, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
                    >
                      <p className="font-medium text-slate-900">{a.name}</p>
                      <p className="text-slate-600">
                        {a.quantity_g}g · {a.calories} kcal · C{a.carb_g} /
                        P{a.protein_g} / F{a.fat_g}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{a.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">無結果</p>
              )}
              <Button type="button" variant="outline" onClick={closeSwap}>
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
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      <div className="h-24 rounded-lg bg-slate-100" />
      <div className="h-24 rounded-lg bg-slate-100" />
      <p className="text-center text-xs text-slate-500">
        AI 正在生成菜單…（完成後會自動更新）
      </p>
    </div>
  );
}
