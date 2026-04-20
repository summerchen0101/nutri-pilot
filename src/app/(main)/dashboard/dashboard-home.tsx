'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { logWeightAction } from '@/app/(main)/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

export type DashboardMealVariant =
  | 'as_planned'
  | 'adjusted'
  | 'self_logged';

export type DashboardMealRow = {
  key: string;
  label: string;
  variant: DashboardMealVariant;
  /** 第二行：狀態說明或計畫摘要 */
  detailLine: string;
  kcal: number | null;
  recordHref: string;
};

export type DashboardHomeProps = {
  displayName: string;
  dateLabel: string;
  latestWeightKg: number | null;
  latestWeightDate: string | null;
  heightCm: number;
  profileBmi: number | null;
  todayKcal: number;
  targetKcal: number | null;
  carbG: number;
  proteinG: number;
  fatG: number;
  streakDays: number;
  meals: DashboardMealRow[];
};

function macroTargetsFromKcal(
  kcal: number,
): { carb: number; protein: number; fat: number } {
  if (!Number.isFinite(kcal) || kcal <= 0) {
    return { carb: 0, protein: 0, fat: 0 };
  }
  return {
    carb: (kcal * 0.5) / 4,
    protein: (kcal * 0.25) / 4,
    fat: (kcal * 0.25) / 9,
  };
}

function CalorieRingBlock({
  todayKcal,
  targetKcal,
  carbG,
  proteinG,
  fatG,
}: {
  todayKcal: number;
  targetKcal: number | null;
  carbG: number;
  proteinG: number;
  fatG: number;
}) {
  const ringR = 36;
  const circumference = 2 * Math.PI * ringR;
  const target = targetKcal != null && targetKcal > 0 ? targetKcal : 0;
  const ratio =
    target > 0 && todayKcal > 0 ? Math.min(1, todayKcal / target) : 0;

  const t = targetKcal != null && targetKcal > 0 ? targetKcal : 0;
  const m = t > 0 ? macroTargetsFromKcal(t) : { carb: 0, protein: 0, fat: 0 };
  const bar = (v: number, cap: number) =>
    cap > 0 ? Math.min(100, (v / cap) * 100) : 0;

  return (
    <div className="rounded-xl border-[0.5px] border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-[120px] w-[120px] shrink-0">
          <svg
            className="h-full w-full -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r={ringR}
              fill="none"
              className="stroke-border"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r={ringR}
              fill="none"
              stroke="#4C956C"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ratio)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {todayKcal <= 0 ? (
              <p className="px-2 text-center text-[11px] text-muted-foreground">
                尚未記錄
              </p>
            ) : (
              <>
                <p className="text-[20px] font-medium leading-tight text-[#1E212B]">
                  {Math.round(todayKcal)}
                </p>
                <p className="text-[9px] text-muted-foreground">kcal</p>
                {t > 0 ? (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    目標 {Math.round(t)}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          {(
            [
              { label: '碳水', v: carbG, cap: m.carb, color: '#378ADD' },
              { label: '蛋白質', v: proteinG, cap: m.protein, color: '#4C956C' },
              { label: '脂肪', v: fatG, cap: m.fat, color: '#EF9F27' },
            ] as const
          ).map((row) => (
            <div key={row.label}>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {row.label}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {Math.round(row.v)}g
                </span>
              </div>
              <div className="h-[5px] w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${bar(row.v, row.cap)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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

function MealStatusDot({ variant }: { variant: DashboardMealVariant }) {
  const bg =
    variant === 'as_planned' ? '#4C956C'
    : variant === 'adjusted' ? '#EF9F27'
    : '#378ADD';
  return (
    <span
      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: bg }}
      aria-hidden
    />
  );
}

export function DashboardHome({
  displayName,
  dateLabel,
  latestWeightKg,
  latestWeightDate,
  heightCm,
  profileBmi,
  todayKcal,
  targetKcal,
  carbG,
  proteinG,
  fatG,
  streakDays,
  meals,
}: DashboardHomeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    'flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border-[0.5px] border-border bg-transparent px-2 py-2 text-[13px] font-normal text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground';

  const goal = targetKcal != null && targetKcal > 0 ? targetKcal : null;
  let calorieSub = '';
  if (goal != null && todayKcal > 0) {
    const diff = goal - todayKcal;
    if (diff >= 0) {
      calorieSub = `尚可攝取約 ${Math.round(diff)} kcal`;
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-medium text-[#1E212B]">
            嗨，{displayName}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{dateLabel}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#E8F5EE] px-2.5 py-0.5 text-[11px] font-medium text-[#2D6B4A]">
          連續 {streakDays} 天
        </span>
      </header>

      <CalorieRingBlock
        todayKcal={todayKcal}
        targetKcal={targetKcal}
        carbG={carbG}
        proteinG={proteinG}
        fatG={fatG}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={openWeightDialog}
          className="rounded-[10px] bg-[#F7F8F6] p-3 text-left transition-colors hover:bg-[#F0F2EE]"
        >
          <p className="text-[11px] text-muted-foreground">體重</p>
          <p className="mt-0.5 tabular-nums text-xl font-medium text-[#1E212B]">
            {latestWeightKg != null ? (
              <>
                {latestWeightKg}
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
          {latestWeightDate ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              最近 · {latestWeightDate}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              尚無體重紀錄
            </p>
          )}
          {profileBmi != null ? (
            <p className="mt-1 text-[11px] text-[#4C956C]">
              BMI {profileBmi}（身高 {heightCm} cm）
            </p>
          ) : null}
        </button>

        <div className="rounded-[10px] bg-[#F7F8F6] p-3">
          <p className="text-[11px] text-muted-foreground">今日熱量</p>
          <p className="mt-0.5 tabular-nums text-xl font-medium text-[#1E212B]">
            {Math.round(todayKcal)}
            <span className="text-[13px] font-normal text-muted-foreground">
              {' '}
              kcal
            </span>
          </p>
          {goal != null ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              目標 {Math.round(goal)} kcal
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              尚未設定目標
            </p>
          )}
          {calorieSub ? (
            <p className="mt-1 text-[11px] text-[#4C956C]">{calorieSub}</p>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
        <p className="text-[15px] font-medium text-foreground">今日餐食</p>
        <ul className="mt-3 space-y-3">
          {meals.map((m) => (
            <li key={m.key}>
              <div className="flex items-start gap-2">
                <MealStatusDot variant={m.variant} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground">
                    {m.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {m.detailLine}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {m.kcal != null ? (
                    <span className="tabular-nums text-[13px] font-medium text-foreground">
                      {m.kcal}{' '}
                      <span className="font-normal text-muted-foreground">
                        kcal
                      </span>
                    </span>
                  ) : null}
                  <Link
                    href={m.recordHref}
                    className="rounded-full border-[0.5px] border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    記錄
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-2">
        <p className="text-[15px] font-medium text-foreground">快速操作</p>
        <div className="grid grid-cols-3 gap-2">
          <Link href="/log" className={cn(ghostQuick)} title="記錄飲食">
            <IconMeal className="text-[#4C956C]" />
            <span className="text-center leading-tight">飲食</span>
          </Link>
          <button type="button" className={cn(ghostQuick)} onClick={openWeightDialog}>
            <IconScale className="text-[#4C956C]" />
            <span className="text-center leading-tight">體重</span>
          </button>
          <Link href="/analytics" className={cn(ghostQuick)} title="數據分析">
            <IconChart className="text-[#4C956C]" />
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
