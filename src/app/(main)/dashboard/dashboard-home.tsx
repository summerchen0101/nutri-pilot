'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { logWeightAction } from '@/app/(main)/dashboard/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

interface DashboardHomeProps {
  displayName: string;
  latestWeightKg: number | null;
  latestWeightDate: string | null;
  heightCm: number;
  profileBmi: number | null;
}

function IconMeal(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={cn('h-4 w-4 shrink-0', props.className)}
      aria-hidden
    >
      <path d="M8 3v15M12 3v15M16 10v8M6 21h12" strokeLinecap="round" />
    </svg>
  );
}

function IconPlan(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={cn('h-4 w-4 shrink-0', props.className)}
      aria-hidden
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 11h16" strokeLinecap="round" />
    </svg>
  );
}

function IconScale(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={cn('h-4 w-4 shrink-0', props.className)}
      aria-hidden
    >
      <path d="M12 3a7 7 0 108 7h-8V3z" strokeLinecap="round" />
      <path d="M12 14v4M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function IconChart(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={cn('h-4 w-4 shrink-0', props.className)}
      aria-hidden
    >
      <path d="M4 19h16M7 16V9M12 16v-5M17 16V6" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardHome({
  displayName,
  latestWeightKg,
  latestWeightDate,
  heightCm,
  profileBmi,
}: DashboardHomeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('zh-Hant', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    [],
  );

  function submit() {
    setError(null);
    const w = parseFloat(weightInput.replace(',', '.'));
    startTransition(async () => {
      const res = await logWeightAction(w);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setWeightInput('');
      router.refresh();
    });
  }

  function openWeightDialog() {
    setOpen(true);
    setError(null);
    if (latestWeightKg != null) {
      setWeightInput(String(latestWeightKg));
    }
  }

  const ghostQuick =
    'flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-[10px] border-[0.5px] border-border bg-transparent px-2 py-2 text-[13px] font-normal text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground';

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-medium text-foreground">
              嗨，{displayName}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{dateLabel}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          今日概覽 · 快速紀錄與捷徑
        </p>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>體重</CardTitle>
          <CardDescription>
            {latestWeightDate
              ? `最近紀錄 · ${latestWeightDate}`
              : '尚無體重紀錄'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground">目前體重</p>
            <p className="mt-0.5 tabular-nums text-foreground">
              {latestWeightKg != null ? (
                <>
                  <span className="text-xl font-medium">{latestWeightKg}</span>
                  <span className="text-[13px] font-normal text-muted-foreground">
                    {' '}
                    kg
                  </span>
                </>
              ) : (
                <span className="text-[13px] font-normal text-muted-foreground">
                  —
                </span>
              )}
            </p>
            {profileBmi != null && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                BMI {profileBmi}（身高 {heightCm} cm）
              </p>
            )}
          </div>
          <Button type="button" onClick={openWeightDialog}>
            記錄體重
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-[15px] font-medium text-foreground">快速操作</p>
        <div className="grid grid-cols-4 gap-2">
          <Link href="/log" className={cn(ghostQuick)} title="記錄飲食">
            <IconMeal />
            <span className="text-center leading-tight">飲食</span>
          </Link>
          <Link href="/plan" className={cn(ghostQuick)} title="今日計畫">
            <IconPlan />
            <span className="text-center leading-tight">計畫</span>
          </Link>
          <button type="button" className={cn(ghostQuick)} onClick={openWeightDialog}>
            <IconScale />
            <span className="text-center leading-tight">體重</span>
          </button>
          <Link href="/analytics" className={cn(ghostQuick)} title="數據分析">
            <IconChart />
            <span className="text-center leading-tight">數據</span>
          </Link>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-4 sm:items-center"
          role="presentation"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="weight-dialog-title"
            className="w-full max-w-sm rounded-2xl border-[0.5px] border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="weight-dialog-title"
              className="text-[15px] font-medium text-foreground"
            >
              記錄今日體重
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              將寫入今日紀錄並更新個人資料與熱量目標（如有）。
            </p>
            <div className="mt-4">
              <label htmlFor="weight-kg" className="sr-only">
                體重（公斤）
              </label>
              <Input
                id="weight-kg"
                type="text"
                inputMode="decimal"
                placeholder="例如 65.5"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                autoFocus
                disabled={pending}
              />
            </div>
            {error ? (
              <p className="mt-2 text-[11px] text-destructive">{error}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="button" disabled={pending} onClick={submit}>
                {pending ? '儲存中…' : '儲存'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
