'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import {
  ACTIVITY_OPTIONS,
  ALLERGEN_OPTIONS,
  DIET_METHOD_OPTIONS,
  DIET_TYPE_OPTIONS,
  DURATION_OPTIONS,
  GENDER_OPTIONS,
  GOAL_TYPE_OPTIONS,
} from '@/lib/onboarding/constants';
import { addCalendarDaysISO, todayLocalISODate } from '@/lib/onboarding/date';
import {
  calcBMI,
  calcBMR,
  calcDailyCalTarget,
  calcTargetDate,
  calcTDEE,
} from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type {
  Database,
  TablesInsert,
  TablesUpdate,
} from '@/types/supabase';

type ProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type GoalRow = Database['public']['Tables']['user_goals']['Row'];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dateToISODateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const selectClass =
  'flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50';

interface OnboardingWizardProps {
  userId: string;
  initialProfile: ProfileRow;
  initialGoal: GoalRow | null;
}

export function OnboardingWizard({
  userId,
  initialProfile,
  initialGoal,
}: OnboardingWizardProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [name, setName] = useState(initialProfile.name || '');
  const [gender, setGender] = useState(initialProfile.gender);
  const [birthDate, setBirthDate] = useState(initialProfile.birth_date ?? '');
  const [activityLevel, setActivityLevel] = useState(initialProfile.activity_level);

  const [heightCm, setHeightCm] = useState(
    initialProfile.height_cm > 0 ? String(initialProfile.height_cm) : '',
  );
  const [weightKg, setWeightKg] = useState(
    initialProfile.weight_kg > 0 ? String(initialProfile.weight_kg) : '',
  );

  const [dietType, setDietType] = useState(initialProfile.diet_type);
  const [mealFrequency, setMealFrequency] = useState(
    initialProfile.meal_frequency || 3,
  );
  const [avoidFoods, setAvoidFoods] = useState<string[]>(
    initialProfile.avoid_foods ?? [],
  );
  const [avoidInput, setAvoidInput] = useState('');
  const [allergens, setAllergens] = useState<string[]>(
    initialProfile.allergens ?? [],
  );

  const [goalType, setGoalType] = useState(
    initialGoal?.type ?? 'maintain',
  );
  const [targetWeightKg, setTargetWeightKg] = useState(
    initialGoal?.target_weight_kg != null
      ? String(initialGoal.target_weight_kg)
      : '',
  );
  const [weeklyRateKg, setWeeklyRateKg] = useState(
    initialGoal != null ? String(initialGoal.weekly_rate_kg) : '0.5',
  );

  const [dietMethod, setDietMethod] = useState(
    'mediterranean' as (typeof DIET_METHOD_OPTIONS)[number]['value'],
  );
  const [durationDays, setDurationDays] =
    useState<number>(14);

  const computed = useMemo(() => {
    const h = Number(heightCm);
    const w = Number(weightKg);
    const bd = birthDate ? new Date(birthDate + 'T12:00:00') : null;
    if (
      !Number.isFinite(h) ||
      !Number.isFinite(w) ||
      h <= 0 ||
      w <= 0 ||
      !bd ||
      Number.isNaN(bd.getTime())
    ) {
      return null;
    }
    const bmi = calcBMI(h, w);
    const bmr = calcBMR(gender, bd, h, w);
    const tdee = calcTDEE(bmr, activityLevel);
    return {
      bmi: round1(bmi),
      bmr: round1(bmr),
      tdee: round1(tdee),
    };
  }, [heightCm, weightKg, birthDate, gender, activityLevel]);

  const step4Preview = useMemo(() => {
    const w = Number(weightKg);
    const tw = Number(targetWeightKg);
    const wr = Number(weeklyRateKg);
    const bd = birthDate ? new Date(birthDate + 'T12:00:00') : null;
    if (
      !computed ||
      !Number.isFinite(w) ||
      !Number.isFinite(tw) ||
      !bd ||
      Number.isNaN(bd.getTime())
    ) {
      return null;
    }
    const weekly =
      goalType === 'maintain' ? 0 : Number.isFinite(wr) ? wr : 0;
    const dailyCal = calcDailyCalTarget(computed.tdee, goalType, weekly);
    const targetD =
      goalType === 'maintain'
        ? null
        : weekly > 0
          ? calcTargetDate(w, tw, weekly)
          : null;
    return {
      dailyCal: round1(dailyCal),
      targetDateLabel: targetD ? dateToISODateOnly(targetD) : '—',
    };
  }, [
    computed,
    weightKg,
    targetWeightKg,
    weeklyRateKg,
    goalType,
    birthDate,
  ]);

  function toggleAllergen(value: string) {
    setAllergens((prev) =>
      prev.includes(value)
        ? prev.filter((x) => x !== value)
        : [...prev, value],
    );
  }

  function addAvoidTag() {
    const t = avoidInput.trim();
    if (!t || avoidFoods.includes(t)) return;
    setAvoidFoods((prev) => [...prev, t]);
    setAvoidInput('');
  }

  function removeAvoidTag(tag: string) {
    setAvoidFoods((prev) => prev.filter((x) => x !== tag));
  }

  async function saveStep1(): Promise<boolean> {
    if (!name.trim()) {
      setError('請輸入姓名');
      return false;
    }
    if (!birthDate) {
      setError('請選擇生日');
      return false;
    }
    const patch: TablesUpdate<'user_profiles'> = {
      name: name.trim(),
      gender,
      birth_date: birthDate,
      activity_level: activityLevel,
    };
    const { error: err } = await supabase
      .from('user_profiles')
      .update(patch)
      .eq('user_id', userId);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }

  async function saveStep2(): Promise<boolean> {
    const h = Number(heightCm);
    const w = Number(weightKg);
    const bd = birthDate ? new Date(birthDate + 'T12:00:00') : null;
    if (!Number.isFinite(h) || h <= 0 || !Number.isFinite(w) || w <= 0) {
      setError('請輸入有效的身高與體重');
      return false;
    }
    if (!bd || Number.isNaN(bd.getTime())) {
      setError('請先完成生日與基本資料');
      return false;
    }
    const bmi = round1(calcBMI(h, w));
    const bmr = round1(calcBMR(gender, bd, h, w));
    const tdee = round1(calcTDEE(bmr, activityLevel));

    const patch: TablesUpdate<'user_profiles'> = {
      height_cm: h,
      weight_kg: w,
      bmi,
      bmr,
      tdee,
    };
    const { error: err } = await supabase
      .from('user_profiles')
      .update(patch)
      .eq('user_id', userId);

    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }

  async function saveStep3(): Promise<boolean> {
    const patch: TablesUpdate<'user_profiles'> = {
      diet_type: dietType,
      meal_frequency: mealFrequency,
      avoid_foods: avoidFoods,
      allergens,
    };
    const { error: err } = await supabase
      .from('user_profiles')
      .update(patch)
      .eq('user_id', userId);

    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }

  async function saveStep4(): Promise<boolean> {
    const currentWeight = Number(weightKg);
    const tw = Number(targetWeightKg);
    const wrRaw = Number(weeklyRateKg);

    if (!Number.isFinite(tw) || tw <= 0) {
      setError('請輸入有效的目標體重');
      return false;
    }

    if (goalType !== 'maintain') {
      if (!Number.isFinite(wrRaw) || wrRaw <= 0) {
        setError('請輸入每週目標變化（公斤）');
        return false;
      }
    }

    if (!computed) {
      setError('請先完成身體數據（步驟 2）');
      return false;
    }

    if (!Number.isFinite(currentWeight) || currentWeight <= 0) {
      setError('請先在步驟 2 輸入目前體重');
      return false;
    }

    const weekly = goalType === 'maintain' ? 0 : wrRaw;
    const dailyCal = round1(
      calcDailyCalTarget(computed.tdee, goalType, weekly),
    );

    let targetDateStr: string | null = null;
    if (goalType !== 'maintain' && weekly > 0) {
      targetDateStr = dateToISODateOnly(
        calcTargetDate(currentWeight, tw, weekly),
      );
    }

    await supabase
      .from('user_goals')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    const row: TablesInsert<'user_goals'> = {
      user_id: userId,
      type: goalType,
      target_weight_kg: tw,
      weekly_rate_kg: weekly,
      daily_cal_target: dailyCal,
      target_date: targetDateStr,
      is_active: true,
    };
    const { error: err } = await supabase.from('user_goals').insert(row);

    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }

  async function saveStep5(): Promise<boolean> {
    const start = todayLocalISODate();
    const end = addCalendarDaysISO(start, durationDays - 1);

    await supabase
      .from('diet_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    const planRow: TablesInsert<'diet_plans'> = {
      user_id: userId,
      diet_method: dietMethod,
      duration_days: durationDays,
      start_date: start,
      end_date: end,
      is_active: true,
    };
    const { data: inserted, error: insertErr } = await supabase
      .from('diet_plans')
      .insert(planRow)
      .select('id')
      .single();

    if (insertErr) {
      setError(insertErr.message);
      return false;
    }

    /** Phase 2：改為呼叫 Edge Function / QStash 觸發 AI 菜單（docs/03-features.md）。 */
    void inserted?.id;

    return true;
  }

  async function next() {
    setError(null);
    setPending(true);
    let ok = false;
    if (step === 1) ok = await saveStep1();
    else if (step === 2) ok = await saveStep2();
    else if (step === 3) ok = await saveStep3();
    else if (step === 4) ok = await saveStep4();

    setPending(false);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, 5));
  }

  async function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  async function finish() {
    setError(null);
    setPending(true);
    const ok = await saveStep5();
    setPending(false);
    if (!ok) return;
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Card className="border-slate-200 shadow-md">
      <CardHeader>
        <p className="text-sm font-medium text-slate-500">
          步驟 {step} / 5
        </p>
        <CardTitle className="text-xl">建立你的飲控檔案</CardTitle>
        <CardDescription>
          依序填寫，每一步都會儲存到雲端，之後可在設定中修改。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                姓名
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的名字"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                性別
              </label>
              <select
                className={selectClass}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                生日
              </label>
              <Input
                type="date"
                value={birthDate}
                max={todayLocalISODate()}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                活動量
              </label>
              <select
                className={selectClass}
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
              >
                {ACTIVITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  身高（cm）
                </label>
                <Input
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="例如 170"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  體重（kg）
                </label>
                <Input
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="例如 65"
                />
              </div>
            </div>
            {computed ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                <p>BMI：{computed.bmi}</p>
                <p>BMR：{computed.bmr} kcal／日</p>
                <p>TDEE（估算）：{computed.tdee} kcal／日</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                請輸入身高、體重並確認步驟 1 的生日與活動量。
              </p>
            )}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                飲食習慣
              </label>
              <select
                className={selectClass}
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                每日餐次
              </label>
              <select
                className={selectClass}
                value={mealFrequency}
                onChange={(e) => setMealFrequency(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} 餐
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                忌食食材（標籤）
              </label>
              <div className="flex gap-2">
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
              <div className="flex flex-wrap gap-2">
                {avoidFoods.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      className="ml-1 rounded-full hover:bg-slate-300"
                      onClick={() => removeAvoidTag(tag)}
                      aria-label={`移除 ${tag}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                過敏原（可複選）
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALLERGEN_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={allergens.includes(o.value)}
                      onChange={() => toggleAllergen(o.value)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                目標類型
              </label>
              <select
                className={selectClass}
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
              >
                {GOAL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  目標體重（kg）
                </label>
                <Input
                  inputMode="decimal"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  placeholder="例如 62"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  每週體重變化（kg／週）
                  {goalType === 'maintain' ? (
                    <span className="font-normal text-slate-500">
                      （維持時可不填）
                    </span>
                  ) : null}
                </label>
                <Input
                  inputMode="decimal"
                  value={weeklyRateKg}
                  onChange={(e) => setWeeklyRateKg(e.target.value)}
                  placeholder={goalType === 'maintain' ? '0' : '例如 0.5'}
                  disabled={goalType === 'maintain'}
                />
              </div>
            </div>
            {step4Preview ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                <p>每日熱量目標（估算）：{step4Preview.dailyCal} kcal</p>
                <p>預計達標日：{step4Preview.targetDateLabel}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                完成步驟 2 後可預覽熱量與達標日。
              </p>
            )}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                飲食法
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                {DIET_METHOD_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setDietMethod(o.value)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      dietMethod === o.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <span className="font-semibold">{o.label}</span>
                    <p
                      className={`mt-1 text-xs ${dietMethod === o.value ? 'text-slate-200' : 'text-slate-500'}`}
                    >
                      {o.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                計畫天數
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={durationDays === d ? 'default' : 'outline'}
                    onClick={() => setDurationDays(d)}
                  >
                    {d} 天
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              完成後將建立飲食計畫並進入總覽。AI
              菜單會在後續 Phase 由 Queue 非同步生成。
            </p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={back}
          disabled={step === 1 || pending}
        >
          上一步
        </Button>
        <div className="flex gap-2">
          {step < 5 ? (
            <Button type="button" onClick={next} disabled={pending}>
              {pending ? '儲存中…' : '下一步'}
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={pending}>
              {pending ? '建立中…' : '完成並進入總覽'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
