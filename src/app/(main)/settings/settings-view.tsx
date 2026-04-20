'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { AccountManagementCard } from '@/app/(main)/settings/_components/account-management-card';
import { BodyMetricsCard } from '@/app/(main)/settings/_components/body-metrics-card';
import { DietPreferencesCard } from '@/app/(main)/settings/_components/diet-preferences-card';
import { GoalSettingsCard } from '@/app/(main)/settings/_components/goal-settings-card';
import { ProfileSummaryCard } from '@/app/(main)/settings/_components/profile-summary-card';
import {
  EditAllergenSheet,
  EditBodyMetricsSheet,
  EditNameSheet,
  GoalInfoSheet,
  GoalInputSheet,
  OptionSelectSheet,
} from '@/app/(main)/settings/_components/settings-sheets';
import {
  bmiStatusText,
  bmiTone,
  dietMethodLabel,
  formatAllergenLabel,
  formatDate,
  goalTypeLabel,
} from '@/app/(main)/settings/_lib/formatters';
import { PageHeader } from '@/components/layout/page-header';
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

      <ProfileSummaryCard
        name={name}
        email={initial.email}
        dayCount={initial.dayCount}
        avatarChar={avatarChar}
        onEditName={openNameSheet}
      />

      <BodyMetricsCard
        heightCm={heightCm}
        weightKg={weightKg}
        bmiValue={bmiValue}
        bmr={initial.bmr}
        tdeePreview={tdeePreview}
        bmiStatus={bmiStatusText(bmiValue)}
        bmiToneClass={bmiTone(bmiValue)}
        onEdit={openBodySheet}
      />

      <GoalSettingsCard
        goalTypeText={goalTypeLabel(goalType)}
        targetWeightText={`${targetW} kg`}
        weeklyRateText={`${weeklyRate} kg/週`}
        dailyCalTargetText={`${Math.round(initial.goal.dailyCalTarget).toLocaleString()} kcal`}
        targetDateText={formatDate(initial.goal.targetDate)}
        error={errGoal}
        onOpenGoalType={() => openGoalSheet('goalType')}
        onOpenGoalWeight={() => openGoalSheet('goalWeight')}
        onOpenGoalWeeklyRate={() => openGoalSheet('goalWeeklyRate')}
        onOpenGoalDailyCal={() => openGoalDependencySheet('goalDailyCal')}
        onOpenGoalTargetDate={() => openGoalDependencySheet('goalTargetDate')}
      />

      <DietPreferencesCard
        dietMethodText={dietMethodLabel(dietMethod)}
        allergenText={allergenText}
        error={errDiet}
        onEditMethod={() => setActiveSheet('dietMethod')}
        onEditAllergens={() => setActiveSheet('allergens')}
      />

      <AccountManagementCard
        onResetData={() => window.alert('此功能稍後開放，將會重置個人紀錄與目標資料。')}
        onSignOut={signOut}
        onDeleteAccount={() => window.alert('刪除帳號功能尚未開放。')}
      />

      <OptionSelectSheet
        open={activeSheet === 'dietMethod'}
        title="編輯飲食方式"
        options={DIET_METHOD_OPTIONS}
        selectedValue={dietMethod}
        pending={pending}
        onClose={() => setActiveSheet(null)}
        onSelect={setDietMethod}
        onSave={() => {
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
      />

      <EditNameSheet
        open={activeSheet === 'profileName'}
        value={nameDraft}
        error={errProfile}
        pending={pending}
        onClose={() => setActiveSheet(null)}
        onChange={setNameDraft}
        onSave={applyNameDraft}
      />

      <EditBodyMetricsSheet
        open={activeSheet === 'bodyMetrics'}
        heightValue={heightDraft}
        weightValue={weightDraft}
        error={errBody}
        pending={pending}
        onClose={() => setActiveSheet(null)}
        onHeightChange={setHeightDraft}
        onWeightChange={setWeightDraft}
        onSave={applyBodyDraft}
      />

      <EditAllergenSheet
        open={activeSheet === 'allergens'}
        options={ALLERGEN_OPTIONS}
        selected={allergens}
        avoidFoods={avoidFoods}
        avoidInput={avoidInput}
        pending={pending}
        onClose={() => setActiveSheet(null)}
        onToggle={toggleAllergen}
        onInputChange={setAvoidInput}
        onAddAvoid={addAvoidTag}
        onRemoveAvoid={(item) => setAvoidFoods((prev) => prev.filter((food) => food !== item))}
        onSave={() => {
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
      />

      <OptionSelectSheet
        open={activeSheet === 'goalType'}
        title="編輯目標類型"
        options={GOAL_TYPE_OPTIONS}
        selectedValue={goalTypeDraft}
        error={errGoal}
        pending={pending}
        onClose={() => setActiveSheet(null)}
        onSelect={onGoalTypeDraftChange}
        onSave={applyGoalDraft}
      />

      <GoalInputSheet
        open={activeSheet === 'goalWeight'}
        title="編輯目標體重"
        value={targetWDraft}
        placeholder="請輸入目標體重（kg）"
        error={errGoal}
        pending={pending}
        onClose={() => setActiveSheet(null)}
        onChange={setTargetWDraft}
        onSave={applyGoalDraft}
      />

      <GoalInputSheet
        open={activeSheet === 'goalWeeklyRate'}
        title="編輯每週速率"
        value={weeklyRateDraft}
        placeholder="請輸入每週速率（kg/週）"
        error={errGoal}
        hint={goalTypeDraft === 'maintain' ? '維持體重目標的每週速率固定為 0。' : undefined}
        disabled={goalTypeDraft === 'maintain'}
        pending={pending}
        onClose={() => setActiveSheet(null)}
        onChange={setWeeklyRateDraft}
        onSave={applyGoalDraft}
      />

      <GoalInfoSheet
        open={activeSheet === 'goalDailyCal'}
        title="編輯每日熱量目標"
        description="每日熱量目標會依目標類型、目標體重與每週速率自動計算。"
        valueText={`目前目標：${Math.round(initial.goal.dailyCalTarget).toLocaleString()} kcal`}
        onClose={() => setActiveSheet(null)}
        onGoEdit={() => setActiveSheet('goalType')}
      />

      <GoalInfoSheet
        open={activeSheet === 'goalTargetDate'}
        title="編輯預計達標日"
        description="預計達標日會依目前體重、目標體重與每週速率自動計算。"
        valueText={`目前日期：${formatDate(initial.goal.targetDate)}`}
        onClose={() => setActiveSheet(null)}
        onGoEdit={() => setActiveSheet('goalWeight')}
      />
    </div>
  );
}
