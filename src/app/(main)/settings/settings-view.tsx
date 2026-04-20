'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { Input } from '@/components/ui/input';
import { MetricTile } from '@/components/ui/metric-tile';
import { SectionCard } from '@/components/ui/section-card';
import { createClient } from '@/lib/supabase/client';
import { ALLERGEN_OPTIONS, DIET_METHOD_OPTIONS, GOAL_TYPE_OPTIONS } from '@/lib/onboarding/constants';

import { saveBodyMetrics, saveDietPreferences, saveGoals, saveProfileName } from '@/app/(main)/settings/actions';

export type SettingsInitialData = {
  name: string;
  email: string;
  dayCount: number;
  heightCm: number;
  weightKg: number;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  dietType: string;
  mealFrequency: number;
  dietMethod: string;
  avoidFoods: string[];
  allergens: string[];
  goal: {
    type: string;
    targetWeightKg: number;
    weeklyRateKg: number;
    dailyCalTarget: number;
    targetDate: string | null;
  };
};

type SheetType =
  | null
  | 'profileName'
  | 'bodyMetrics'
  | 'dietMethod'
  | 'allergens'
  | 'goalType'
  | 'goalWeight'
  | 'goalWeeklyRate'
  | 'goalDailyCal'
  | 'goalTargetDate';

function goalTypeLabel(value: string): string {
  return GOAL_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function dietMethodLabel(value: string): string {
  return DIET_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function bmiTone(bmi: number | null): string {
  if (bmi == null) return 'text-[#4A4F63]';
  if (bmi < 18.5) return 'text-[#378ADD]';
  if (bmi < 25) return 'text-[#4C956C]';
  if (bmi < 30) return 'text-[#EF9F27]';
  return 'text-[#E55A3C]';
}

function bmiStatusText(bmi: number | null): string {
  if (bmi == null) return '尚未計算';
  if (bmi < 18.5) return '偏輕';
  if (bmi < 25) return '健康';
  if (bmi < 30) return '過重';
  return '肥胖';
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return value.replaceAll('-', '/');
}

function formatAllergenLabel(value: string): string {
  if (value === 'shellfish') return '蝦';
  if (value === 'peanuts') return '花生';
  return ALLERGEN_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function Row({
  label,
  value,
  onClick,
  valueClassName,
  trailing,
  danger,
  withBorder = true,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  valueClassName?: string;
  trailing?: React.ReactNode;
  danger?: boolean;
  withBorder?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full appearance-none items-center justify-between border-0 bg-transparent py-3 text-left',
        withBorder ? 'mb-0.5' : '',
      ].join(' ')}
    >
      <span className={danger ? 'text-[13px] text-[#E55A3C]' : 'text-[13px] text-[#9298A8]'}>{label}</span>
      <div className="flex items-center gap-2">
        {value ? <span className={valueClassName ?? 'text-[13px] text-[#1E212B]'}>{value}</span> : null}
        {trailing ?? <span className={danger ? 'text-[#E55A3C]' : 'text-[#9298A8]'}>{'>'}</span>}
      </div>
    </button>
  );
}

export function SettingsView({ initial }: { initial: SettingsInitialData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initial.name);
  const [nameDraft, setNameDraft] = useState(initial.name);

  const [heightCm, setHeightCm] = useState(initial.heightCm > 0 ? String(initial.heightCm) : '');
  const [weightKg, setWeightKg] = useState(initial.weightKg > 0 ? String(initial.weightKg) : '');
  const [heightDraft, setHeightDraft] = useState(initial.heightCm > 0 ? String(initial.heightCm) : '');
  const [weightDraft, setWeightDraft] = useState(initial.weightKg > 0 ? String(initial.weightKg) : '');

  const [goalType, setGoalType] = useState(initial.goal.type);
  const [targetW, setTargetW] = useState(String(initial.goal.targetWeightKg));
  const [weeklyRate, setWeeklyRate] = useState(initial.goal.type === 'maintain' ? '0' : String(initial.goal.weeklyRateKg));
  const [goalTypeDraft, setGoalTypeDraft] = useState(initial.goal.type);
  const [targetWDraft, setTargetWDraft] = useState(String(initial.goal.targetWeightKg));
  const [weeklyRateDraft, setWeeklyRateDraft] = useState(initial.goal.type === 'maintain' ? '0' : String(initial.goal.weeklyRateKg));

  const [dietMethod, setDietMethod] = useState(initial.dietMethod);
  const [dietType] = useState(initial.dietType);
  const [mealFreq] = useState(initial.mealFrequency);
  const [allergens, setAllergens] = useState<string[]>(initial.allergens ?? []);
  const [avoidFoods, setAvoidFoods] = useState<string[]>(initial.avoidFoods ?? []);
  const [avoidInput, setAvoidInput] = useState('');
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  const [errProfile, setErrProfile] = useState<string | null>(null);
  const [errBody, setErrBody] = useState<string | null>(null);
  const [errGoal, setErrGoal] = useState<string | null>(null);
  const [errDiet, setErrDiet] = useState<string | null>(null);

  const bmiValue = useMemo(() => {
    const h = Number.parseFloat(heightCm.replace(',', '.'));
    const w = Number.parseFloat(weightKg.replace(',', '.'));
    if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return initial.bmi;
    const hm = h / 100;
    return Math.round((w / (hm * hm)) * 10) / 10;
  }, [heightCm, weightKg, initial.bmi]);

  const tdeePreview = useMemo(() => Math.round(initial.tdee ?? initial.goal.dailyCalTarget * 1.3), [initial.tdee, initial.goal.dailyCalTarget]);
  const avatarChar = (name.trim().charAt(0) || '?').toUpperCase();
  const allergenText = allergens.length ? allergens.map(formatAllergenLabel).join('・') : '未設定';

  function refresh() {
    router.refresh();
  }

  function toggleAllergen(value: string) {
    setAllergens((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  function addAvoidTag() {
    const text = avoidInput.trim();
    if (!text || avoidFoods.includes(text)) return;
    setAvoidFoods((prev) => [...prev, text]);
    setAvoidInput('');
  }

  function signOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    });
  }

  function openNameSheet() {
    setNameDraft(name);
    setErrProfile(null);
    setActiveSheet('profileName');
  }

  function openBodySheet() {
    setHeightDraft(heightCm);
    setWeightDraft(weightKg);
    setErrBody(null);
    setActiveSheet('bodyMetrics');
  }

  function applyNameDraft() {
    setErrProfile(null);
    startTransition(async () => {
      const result = await saveProfileName(nameDraft);
      if (result.error) {
        setErrProfile(result.error);
        return;
      }
      setName(nameDraft.trim());
      setActiveSheet(null);
      refresh();
    });
  }

  function applyBodyDraft() {
    setErrBody(null);
    startTransition(async () => {
      const nextHeight = Number.parseFloat(heightDraft.replace(',', '.'));
      const nextWeight = Number.parseFloat(weightDraft.replace(',', '.'));
      const result = await saveBodyMetrics(nextHeight, nextWeight);
      if (result.error) {
        setErrBody(result.error);
        return;
      }
      setHeightCm(heightDraft);
      setWeightKg(weightDraft);
      setActiveSheet(null);
      refresh();
    });
  }

  function openGoalSheet(sheet: Exclude<SheetType, null | 'dietMethod' | 'allergens'>) {
    setGoalTypeDraft(goalType);
    setTargetWDraft(targetW);
    setWeeklyRateDraft(weeklyRate);
    setErrGoal(null);
    setActiveSheet(sheet);
  }

  function openGoalDependencySheet(sheet: 'goalDailyCal' | 'goalTargetDate') {
    setGoalTypeDraft(goalType);
    setTargetWDraft(targetW);
    setWeeklyRateDraft(weeklyRate);
    setErrGoal(null);
    setActiveSheet(sheet);
  }

  function onGoalTypeDraftChange(next: string) {
    setGoalTypeDraft(next);
    if (next === 'maintain') {
      setWeeklyRateDraft('0');
    } else if (!weeklyRateDraft || Number.parseFloat(weeklyRateDraft) <= 0) {
      setWeeklyRateDraft('0.25');
    }
  }

  function applyGoalDraft() {
    setErrGoal(null);
    startTransition(async () => {
      const targetWeight = Number.parseFloat(targetWDraft.replace(',', '.'));
      const weekly = goalTypeDraft === 'maintain' ? 0 : Number.parseFloat(weeklyRateDraft.replace(',', '.'));

      const response = await saveGoals({
        type: goalTypeDraft,
        targetWeightKg: targetWeight,
        weeklyRateKg: weekly,
      });
      if (response.error) {
        setErrGoal(response.error);
        return;
      }

      setGoalType(goalTypeDraft);
      setTargetW(String(targetWeight));
      setWeeklyRate(String(weekly));
      setActiveSheet(null);
      refresh();
    });
  }

  return (
    <div className="space-y-3 pb-4">
      <PageHeader title="設定" description="管理個人資料、目標與飲食偏好。" />

      <SectionCard className="bg-[var(--color-background-primary)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EBF5EF] text-[20px] font-medium text-[#4C956C]">
            {avatarChar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-medium text-[#1E212B]">{name}</div>
            <div className="mt-0.5 truncate text-[13px] text-[#9298A8]">{initial.email}</div>
            <div className="mt-1.5 flex gap-2">
              <span className="rounded-full bg-[#EBF5EF] px-2 py-0.5 text-[11px] font-medium text-[#4C956C]">Free 會員</span>
              <span className="rounded-full bg-[#F4F4F6] px-2 py-0.5 text-[11px] font-medium text-[#4A4F63]">第 {initial.dayCount} 天</span>
            </div>
          </div>
          <button
            type="button"
            className="rounded-[8px] border border-[#4C956C] px-3 py-1.5 text-[12px] text-[#4C956C]"
            onClick={openNameSheet}
          >
            編輯
          </button>
        </div>
      </SectionCard>

      <SectionCard className="bg-[var(--color-background-primary)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-medium text-[#1E212B]">身體數據</div>
          <button
            type="button"
            className="rounded-[8px] border border-[#4C956C] px-3 py-1 text-[12px] text-[#4C956C]"
            onClick={openBodySheet}
          >
            更新
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '身高cm', value: heightCm || '-' },
            { label: '體重kg', value: weightKg || '-' },
            { label: 'BMI', value: bmiValue != null ? String(bmiValue) : '-', valueClassName: bmiTone(bmiValue) },
            { label: '體脂%', value: '-' },
            { label: 'BMR kcal', value: initial.bmr != null ? Math.round(initial.bmr).toLocaleString() : '-' },
            { label: 'TDEE kcal', value: tdeePreview > 0 ? tdeePreview.toLocaleString() : '-' },
          ].map((metric) => (
            <MetricTile
              key={metric.label}
              label={metric.label}
              value={metric.value}
              className="px-2 py-3 text-center"
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-[#EBF5EF] px-3 py-2">
          <span className="text-[11px] text-[#4C956C]">BMI 正常範圍（18.5-24.9）</span>
          <span className={['text-[11px] font-medium', bmiTone(bmiValue)].join(' ')}>{bmiStatusText(bmiValue)}</span>
        </div>
      </SectionCard>

      <SectionCard className="bg-[var(--color-background-primary)]">
        <div className="mb-1 text-[15px] font-medium text-[#1E212B]">飲控目標</div>
        <Row
          label="目標類型"
          value={goalTypeLabel(goalType)}
          onClick={() => openGoalSheet('goalType')}
        />
        <Row
          label="目標體重"
          value={`${targetW} kg`}
          onClick={() => openGoalSheet('goalWeight')}
        />
        <Row
          label="每週速率"
          value={`${weeklyRate} kg/週`}
          onClick={() => openGoalSheet('goalWeeklyRate')}
        />
        <Row
          label="每日熱量目標"
          value={`${Math.round(initial.goal.dailyCalTarget).toLocaleString()} kcal`}
          trailing={<span className="rounded-full bg-[#EBF5EF] px-2 py-0.5 text-[11px] font-medium text-[#4C956C]">自動</span>}
          onClick={() => openGoalDependencySheet('goalDailyCal')}
        />
        <Row
          label="預計達標日"
          value={formatDate(initial.goal.targetDate)}
          valueClassName="text-[13px] text-[#4C956C]"
          withBorder={false}
          onClick={() => openGoalDependencySheet('goalTargetDate')}
        />
        {errGoal ? <p className="mt-1 text-[11px] text-[#E55A3C]">{errGoal}</p> : null}
      </SectionCard>

      <SectionCard className="bg-[var(--color-background-primary)]">
        <div className="mb-1 text-[15px] font-medium text-[#1E212B]">飲食偏好</div>
        <Row label="飲食方式" value={dietMethodLabel(dietMethod)} onClick={() => setActiveSheet('dietMethod')} />
        <Row label="忌食 / 過敏" value={allergenText} onClick={() => setActiveSheet('allergens')} withBorder={false} />
        {errDiet ? <p className="mt-1 text-[11px] text-[#E55A3C]">{errDiet}</p> : null}
      </SectionCard>

      <SectionCard className="bg-[var(--color-background-primary)]">
        <div className="mb-1 text-[15px] font-medium text-[#1E212B]">帳號管理</div>
        <Row
          label="重置數據"
          onClick={() => window.alert('此功能稍後開放，將會重置個人紀錄與目標資料。')}
        />
        <Row label="登出" onClick={signOut} />
        <Row label="刪除帳號" onClick={() => window.alert('刪除帳號功能尚未開放。')} danger withBorder={false} />
      </SectionCard>

      <BottomSheetShell open={activeSheet === 'dietMethod'} title="編輯飲食方式" onClose={() => setActiveSheet(null)}>
        <div className="grid gap-2 pb-3">
          {DIET_METHOD_OPTIONS.map((option) => {
            const active = dietMethod === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={[
                  'w-full rounded-[10px] border px-3 py-2 text-left text-[13px]',
                  active ? 'border-[#4C956C] bg-[#EBF5EF] text-[#2D6B4A]' : 'border-[#E8E9ED] text-[#1E212B]',
                ].join(' ')}
                onClick={() => setDietMethod(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-[10px] bg-[#1E212B] py-2 text-[13px] font-medium text-white disabled:opacity-60"
          onClick={() => {
            setErrDiet(null);
            startTransition(async () => {
              const result = await saveDietPreferences({
                dietType,
                mealFrequency: mealFreq,
                avoidFoods,
                allergens,
                dietMethod,
              });
              if (result.error) {
                setErrDiet(result.error);
                return;
              }
              setActiveSheet(null);
              refresh();
            });
          }}
        >
          儲存
        </button>
      </BottomSheetShell>

      <BottomSheetShell open={activeSheet === 'profileName'} title="編輯姓名" onClose={() => setActiveSheet(null)}>
        <div className="space-y-2 pb-3">
          <Input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            placeholder="輸入名稱"
            className="border-[0.5px] border-[#E8E9ED] bg-white text-[13px]"
          />
          {errProfile ? <p className="text-[11px] text-[#E55A3C]">{errProfile}</p> : null}
        </div>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-[10px] bg-[#1E212B] py-2 text-[13px] font-medium text-white disabled:opacity-60"
          onClick={applyNameDraft}
        >
          儲存
        </button>
      </BottomSheetShell>

      <BottomSheetShell open={activeSheet === 'bodyMetrics'} title="編輯身體數據" onClose={() => setActiveSheet(null)}>
        <div className="space-y-2 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={heightDraft}
              inputMode="decimal"
              onChange={(event) => setHeightDraft(event.target.value)}
              placeholder="身高 cm"
              className="border-[0.5px] border-[#E8E9ED] bg-white text-[13px]"
            />
            <Input
              value={weightDraft}
              inputMode="decimal"
              onChange={(event) => setWeightDraft(event.target.value)}
              placeholder="體重 kg"
              className="border-[0.5px] border-[#E8E9ED] bg-white text-[13px]"
            />
          </div>
          {errBody ? <p className="text-[11px] text-[#E55A3C]">{errBody}</p> : null}
        </div>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-[10px] bg-[#1E212B] py-2 text-[13px] font-medium text-white disabled:opacity-60"
          onClick={applyBodyDraft}
        >
          儲存
        </button>
      </BottomSheetShell>

      <BottomSheetShell open={activeSheet === 'allergens'} title="編輯忌食 / 過敏" onClose={() => setActiveSheet(null)}>
        <div className="grid gap-2 pb-3">
          {ALLERGEN_OPTIONS.map((option) => {
            const checked = allergens.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={[
                  'w-full rounded-[10px] border px-3 py-2 text-left text-[13px]',
                  checked ? 'border-[#4C956C] bg-[#EBF5EF] text-[#2D6B4A]' : 'border-[#E8E9ED] text-[#1E212B]',
                ].join(' ')}
                onClick={() => toggleAllergen(option.value)}
              >
                {option.label}
              </button>
            );
          })}
          <div className="flex items-center gap-2">
            <Input
              value={avoidInput}
              className="min-w-0 flex-1"
              onChange={(event) => setAvoidInput(event.target.value)}
              placeholder="新增忌食項目"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addAvoidTag();
                }
              }}
            />
            <button
              type="button"
              className="h-10 shrink-0 whitespace-nowrap rounded-[10px] border border-[#4C956C] px-3 text-[12px] text-[#4C956C]"
              onClick={addAvoidTag}
            >
              新增
            </button>
          </div>
          {avoidFoods.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {avoidFoods.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full bg-[#F4F4F6] px-2 py-1 text-[11px] text-[#4A4F63]"
                  onClick={() => setAvoidFoods((prev) => prev.filter((food) => food !== item))}
                >
                  {item} ×
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-[10px] bg-[#1E212B] py-2 text-[13px] font-medium text-white disabled:opacity-60"
          onClick={() => {
            setErrDiet(null);
            startTransition(async () => {
              const result = await saveDietPreferences({
                dietType,
                mealFrequency: mealFreq,
                avoidFoods,
                allergens,
                dietMethod,
              });
              if (result.error) {
                setErrDiet(result.error);
                return;
              }
              setActiveSheet(null);
              refresh();
            });
          }}
        >
          儲存
        </button>
      </BottomSheetShell>

      <BottomSheetShell open={activeSheet === 'goalType'} title="編輯目標類型" onClose={() => setActiveSheet(null)}>
        <div className="grid gap-2 pb-3">
          {GOAL_TYPE_OPTIONS.map((option) => {
            const active = goalTypeDraft === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={[
                  'w-full rounded-[10px] border px-3 py-2 text-left text-[13px]',
                  active ? 'border-[#4C956C] bg-[#EBF5EF] text-[#2D6B4A]' : 'border-[#E8E9ED] text-[#1E212B]',
                ].join(' ')}
                onClick={() => onGoalTypeDraftChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
          {errGoal ? <p className="text-[11px] text-[#E55A3C]">{errGoal}</p> : null}
        </div>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-[10px] bg-[#1E212B] py-2 text-[13px] font-medium text-white disabled:opacity-60"
          onClick={applyGoalDraft}
        >
          儲存
        </button>
      </BottomSheetShell>

      <BottomSheetShell open={activeSheet === 'goalWeight'} title="編輯目標體重" onClose={() => setActiveSheet(null)}>
        <div className="space-y-2 pb-3">
          <Input
            value={targetWDraft}
            inputMode="decimal"
            className="border-[0.5px] border-[#E8E9ED] bg-white text-[13px]"
            onChange={(event) => setTargetWDraft(event.target.value)}
            placeholder="請輸入目標體重（kg）"
          />
          {errGoal ? <p className="text-[11px] text-[#E55A3C]">{errGoal}</p> : null}
        </div>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-[10px] bg-[#1E212B] py-2 text-[13px] font-medium text-white disabled:opacity-60"
          onClick={applyGoalDraft}
        >
          儲存
        </button>
      </BottomSheetShell>

      <BottomSheetShell open={activeSheet === 'goalWeeklyRate'} title="編輯每週速率" onClose={() => setActiveSheet(null)}>
        <div className="space-y-2 pb-3">
          <Input
            value={weeklyRateDraft}
            inputMode="decimal"
            className="border-[0.5px] border-[#E8E9ED] bg-white text-[13px]"
            onChange={(event) => setWeeklyRateDraft(event.target.value)}
            placeholder="請輸入每週速率（kg/週）"
            disabled={goalTypeDraft === 'maintain'}
          />
          {goalTypeDraft === 'maintain' ? <p className="text-[11px] text-[#9298A8]">維持體重目標的每週速率固定為 0。</p> : null}
          {errGoal ? <p className="text-[11px] text-[#E55A3C]">{errGoal}</p> : null}
        </div>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-[10px] bg-[#1E212B] py-2 text-[13px] font-medium text-white disabled:opacity-60"
          onClick={applyGoalDraft}
        >
          儲存
        </button>
      </BottomSheetShell>

      <BottomSheetShell open={activeSheet === 'goalDailyCal'} title="編輯每日熱量目標" onClose={() => setActiveSheet(null)}>
        <div className="space-y-2 pb-3">
          <p className="text-[11px] text-[#9298A8]">每日熱量目標會依目標類型、目標體重與每週速率自動計算。</p>
          <div className="rounded-[10px] border border-[#E8E9ED] px-3 py-2 text-[13px] text-[#1E212B]">
            目前目標：{Math.round(initial.goal.dailyCalTarget).toLocaleString()} kcal
          </div>
          <button
            type="button"
            className="w-full rounded-[10px] border border-[#4C956C] py-2 text-[13px] text-[#4C956C]"
            onClick={() => {
              setActiveSheet('goalType');
            }}
          >
            編輯計算條件
          </button>
        </div>
        <button
          type="button"
          className="w-full rounded-[10px] bg-[#1E212B] py-2 text-[13px] font-medium text-white"
          onClick={() => setActiveSheet(null)}
        >
          關閉
        </button>
      </BottomSheetShell>

      <BottomSheetShell open={activeSheet === 'goalTargetDate'} title="編輯預計達標日" onClose={() => setActiveSheet(null)}>
        <div className="space-y-2 pb-3">
          <p className="text-[11px] text-[#9298A8]">預計達標日會依目前體重、目標體重與每週速率自動計算。</p>
          <div className="rounded-[10px] border border-[#E8E9ED] px-3 py-2 text-[13px] text-[#1E212B]">
            目前日期：{formatDate(initial.goal.targetDate)}
          </div>
          <button
            type="button"
            className="w-full rounded-[10px] border border-[#4C956C] py-2 text-[13px] text-[#4C956C]"
            onClick={() => {
              setActiveSheet('goalWeight');
            }}
          >
            編輯計算條件
          </button>
        </div>
        <button
          type="button"
          className="w-full rounded-[10px] bg-[#1E212B] py-2 text-[13px] font-medium text-white"
          onClick={() => setActiveSheet(null)}
        >
          關閉
        </button>
      </BottomSheetShell>
    </div>
  );
}
