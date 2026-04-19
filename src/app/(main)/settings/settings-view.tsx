'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ALLERGEN_OPTIONS,
  DIET_METHOD_OPTIONS,
  DIET_TYPE_OPTIONS,
  GOAL_TYPE_OPTIONS,
} from '@/lib/onboarding/constants';
import { cn } from '@/lib/utils/cn';

import {
  saveBodyMetrics,
  saveDietPreferences,
  saveGoals,
  saveProfileName,
} from '@/app/(main)/settings/actions';

const selectClass =
  'flex h-10 w-full rounded-[10px] border-[0.5px] border-border bg-card px-3 text-[13px] text-foreground focus-visible:outline-none focus-visible:border-[#4C956C] focus-visible:ring-2 focus-visible:ring-[#4C956C]/12';

export type SettingsInitialData = {
  name: string;
  heightCm: number;
  weightKg: number;
  bmi: number | null;
  dietType: string;
  mealFrequency: number;
  avoidFoods: string[];
  allergens: string[];
  dietMethod: string;
  goal: {
    type: string;
    targetWeightKg: number;
    weeklyRateKg: number;
    dailyCalTarget: number;
    targetDate: string | null;
  };
  subscriptions: {
    id: string;
    status: string;
    frequency: string;
    next_ship_at: string | null;
    created_at: string | null;
  }[];
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function freqLabel(f: string): string {
  const m: Record<string, string> = {
    weekly: '每週寄送',
    biweekly: '每兩週寄送',
    monthly: '每月寄送',
  };
  return m[f] ?? f;
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    active: '進行中',
    canceled: '已取消',
    past_due: '付款逾期',
    unpaid: '未付款',
    trialing: '試用中',
  };
  return m[s] ?? s;
}

export function SettingsView({ initial }: { initial: SettingsInitialData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initial.name);
  const [heightCm, setHeightCm] = useState(
    initial.heightCm > 0 ? String(initial.heightCm) : '',
  );
  const [weightKg, setWeightKg] = useState(
    initial.weightKg > 0 ? String(initial.weightKg) : '',
  );

  const [goalType, setGoalType] = useState(initial.goal.type);
  const [targetW, setTargetW] = useState(String(initial.goal.targetWeightKg));
  const [weeklyRate, setWeeklyRate] = useState(
    initial.goal.type === 'maintain' ?
      '0'
    : String(initial.goal.weeklyRateKg),
  );

  const [dietType, setDietType] = useState(initial.dietType);
  const [mealFreq, setMealFreq] = useState(initial.mealFrequency);
  const [avoidFoods, setAvoidFoods] = useState<string[]>(
    initial.avoidFoods ?? [],
  );
  const [avoidInput, setAvoidInput] = useState('');
  const [allergens, setAllergens] = useState<string[]>(
    initial.allergens ?? [],
  );
  const [dietMethod, setDietMethod] = useState(initial.dietMethod);

  const [errProfile, setErrProfile] = useState<string | null>(null);
  const [errBody, setErrBody] = useState<string | null>(null);
  const [errGoal, setErrGoal] = useState<string | null>(null);
  const [errDiet, setErrDiet] = useState<string | null>(null);

  const bodyPreview = useMemo(() => {
    const h = parseFloat(heightCm.replace(',', '.'));
    const w = parseFloat(weightKg.replace(',', '.'));
    if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) {
      return null;
    }
    const hm = h / 100;
    const bmi = w / (hm * hm);
    return { bmi: Math.round(bmi * 10) / 10 };
  }, [heightCm, weightKg]);

  function refresh() {
    router.refresh();
  }

  function addAvoidTag() {
    const t = avoidInput.trim();
    if (!t) return;
    if (avoidFoods.includes(t)) return;
    setAvoidFoods((prev) => [...prev, t]);
    setAvoidInput('');
  }

  function removeAvoidTag(tag: string) {
    setAvoidFoods((prev) => prev.filter((x) => x !== tag));
  }

  function toggleAllergen(value: string) {
    setAllergens((prev) =>
      prev.includes(value) ?
        prev.filter((x) => x !== value)
      : [...prev, value],
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-medium text-[#1E212B]">設定</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          個人資料、身體數據與飲食偏好
        </p>
      </header>

      <Section title="個人資料" description="顯示於問候語與紀錄中的名字。">
        <div>
          <label htmlFor="settings-name" className="text-[11px] text-muted-foreground">
            姓名
          </label>
          <Input
            id="settings-name"
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字"
          />
        </div>
        {errProfile ? (
          <p className="text-[11px] text-destructive">{errProfile}</p>
        ) : null}
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setErrProfile(null);
            startTransition(async () => {
              const res = await saveProfileName(name);
              if (res.error) setErrProfile(res.error);
              else refresh();
            });
          }}
        >
          {pending ? '儲存中…' : '儲存'}
        </Button>
      </Section>

      <Section
        title="身體數據"
        description="更新身高與體重後會重算 BMI、BMR、TDEE，並同步調整每日熱量目標。"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="settings-h" className="text-[11px] text-muted-foreground">
              身高（cm）
            </label>
            <Input
              id="settings-h"
              className="mt-1"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="例如 168"
            />
          </div>
          <div>
            <label htmlFor="settings-w" className="text-[11px] text-muted-foreground">
              體重（kg）
            </label>
            <Input
              id="settings-w"
              className="mt-1"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="例如 62"
            />
          </div>
        </div>
        {bodyPreview ?
          <p className="text-[11px] text-[#2D6B4A]">
            估算 BMI：{bodyPreview.bmi}
            {initial.bmi != null ?
              <span className="text-muted-foreground">
                {' '}
                （上次紀錄 {initial.bmi}）
              </span>
            : null}
          </p>
        : null}
        {errBody ? (
          <p className="text-[11px] text-destructive">{errBody}</p>
        ) : null}
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setErrBody(null);
            startTransition(async () => {
              const h = parseFloat(heightCm.replace(',', '.'));
              const w = parseFloat(weightKg.replace(',', '.'));
              const res = await saveBodyMetrics(h, w);
              if (res.error) setErrBody(res.error);
              else refresh();
            });
          }}
        >
          {pending ? '儲存中…' : '儲存'}
        </Button>
      </Section>

      <Section title="飲控目標" description="依目標類型重算每日熱量與預計達標日。">
        <div>
          <label htmlFor="settings-goal-type" className="text-[11px] text-muted-foreground">
            目標類型
          </label>
          <select
            id="settings-goal-type"
            className={cn(selectClass, 'mt-1')}
            value={goalType}
            onChange={(e) => {
              const v = e.target.value;
              setGoalType(v);
              if (v === 'maintain') setWeeklyRate('0');
            }}
          >
            {GOAL_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="settings-tw" className="text-[11px] text-muted-foreground">
              目標體重（kg）
            </label>
            <Input
              id="settings-tw"
              className="mt-1"
              inputMode="decimal"
              value={targetW}
              onChange={(e) => setTargetW(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="settings-wr" className="text-[11px] text-muted-foreground">
              每週變化（kg／週）
            </label>
            <Input
              id="settings-wr"
              className="mt-1"
              inputMode="decimal"
              value={weeklyRate}
              onChange={(e) => setWeeklyRate(e.target.value)}
              disabled={goalType === 'maintain'}
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          目前每日目標約 {Math.round(initial.goal.dailyCalTarget)} kcal
          {initial.goal.targetDate ?
            <>，預計達標日 {initial.goal.targetDate}</>
          : null}
        </p>
        {errGoal ? (
          <p className="text-[11px] text-destructive">{errGoal}</p>
        ) : null}
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setErrGoal(null);
            startTransition(async () => {
              const tw = parseFloat(targetW.replace(',', '.'));
              const wr = parseFloat(weeklyRate.replace(',', '.'));
              const res = await saveGoals({
                type: goalType,
                targetWeightKg: tw,
                weeklyRateKg: goalType === 'maintain' ? 0 : wr,
              });
              if (res.error) setErrGoal(res.error);
              else refresh();
            });
          }}
        >
          {pending ? '儲存中…' : '儲存'}
        </Button>
      </Section>

      <Section
        title="飲食偏好"
        description="影響商城推薦；儲存後會嘗試重算推薦分數（若已部署對應 Edge Function）。"
      >
        <div>
          <label htmlFor="settings-diet-type" className="text-[11px] text-muted-foreground">
            飲食類型
          </label>
          <select
            id="settings-diet-type"
            className={cn(selectClass, 'mt-1')}
            value={dietType}
            onChange={(e) => setDietType(e.target.value)}
          >
            {DIET_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="settings-meals" className="text-[11px] text-muted-foreground">
            每日餐次
          </label>
          <select
            id="settings-meals"
            className={cn(selectClass, 'mt-1')}
            value={mealFreq}
            onChange={(e) => setMealFreq(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} 餐
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="settings-method" className="text-[11px] text-muted-foreground">
            計畫飲食法
          </label>
          <select
            id="settings-method"
            className={cn(selectClass, 'mt-1')}
            value={dietMethod}
            onChange={(e) => setDietMethod(e.target.value)}
          >
            {DIET_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-[11px] text-muted-foreground">忌食標籤</span>
          <div className="mt-1 flex gap-2">
            <Input
              value={avoidInput}
              onChange={(e) => setAvoidInput(e.target.value)}
              placeholder="輸入後按新增"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAvoidTag();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addAvoidTag}>
              新增
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {avoidFoods.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  className="ml-0.5 rounded-full hover:opacity-80"
                  onClick={() => removeAvoidTag(tag)}
                  aria-label={`移除 ${tag}`}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[11px] text-muted-foreground">
            過敏原（可複選）
          </span>
          <div className="mt-2 grid gap-2">
            {ALLERGEN_OPTIONS.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground"
              >
                <input
                  type="checkbox"
                  checked={allergens.includes(o.value)}
                  onChange={() => toggleAllergen(o.value)}
                  className="h-4 w-4 rounded border-[0.5px] border-border accent-[#4C956C]"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
        {errDiet ? (
          <p className="text-[11px] text-destructive">{errDiet}</p>
        ) : null}
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setErrDiet(null);
            startTransition(async () => {
              const res = await saveDietPreferences({
                dietType,
                mealFrequency: mealFreq,
                avoidFoods,
                allergens,
                dietMethod,
              });
              if (res.error) setErrDiet(res.error);
              else refresh();
            });
          }}
        >
          {pending ? '儲存中…' : '儲存'}
        </Button>
      </Section>

      <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
        <p className="text-[15px] font-medium text-foreground">帳號與訂閱</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          登出目前帳號，或前往商城查看訂閱方案。
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SignOutButton />
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-[10px] border-[1.5px] border-[#4C956C] bg-transparent px-4 py-2 text-[13px] font-medium text-[#4C956C] transition-colors hover:bg-[#E8F5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C]/20 focus-visible:ring-offset-2"
          >
            前往商城
          </Link>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[13px] font-medium text-foreground">我的訂閱</p>
          {initial.subscriptions.length === 0 ?
            <p className="mt-2 text-[13px] text-muted-foreground">
              目前沒有訂閱紀錄。方案上架後可於此查看狀態與寄送頻率。
            </p>
          : (
            <ul className="mt-3 space-y-3">
              {initial.subscriptions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-[10px] bg-secondary/60 px-3 py-2.5 text-[13px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {statusLabel(s.status)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {freqLabel(s.frequency)}
                    </span>
                  </div>
                  {s.next_ship_at ?
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      下次寄送 · {s.next_ship_at}
                    </p>
                  : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
