'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { FiCamera, FiTrash2 } from 'react-icons/fi';

import {
  AddFoodManualAiPanel,
  type StagedFoodItemForPlan,
} from '@/app/(main)/log/add-food-manual-ai';
import {
  commitPrefillFromPlanAction,
  confirmPhotoItemsAction,
  deleteFoodLogAction,
} from '@/app/(main)/log/actions';
import { NutritionResultCard } from '@/components/food/NutritionResultCard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { compressImageForUpload } from '@/lib/food/compress-image-for-upload';
import { invokeAiPhotoRequestFromBrowser } from '@/lib/food/invoke-photo-request';
import type { ManualFoodAnalysisResult } from '@/lib/food/manual-food-analysis-result';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/types/supabase';

export interface LogItemSnapshot {
  id: string;
  name: string;
  quantity_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number | null;
  sodium_mg: number | null;
  brand: string | null;
  is_verified: boolean | null;
}

export interface FoodLogSnapshot {
  id: string;
  meal_type: string;
  method: string;
  logged_at: string | null;
  food_log_items: LogItemSnapshot[] | null;
}

const MEAL_LABEL: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

type MealType = (typeof MEAL_ORDER)[number];

export interface PlanPrefillPayload {
  mealId: string;
  mealType: MealType;
  items: Array<{
    name: string;
    quantity_g: number;
    calories: number;
    carb_g: number;
    protein_g: number;
    fat_g: number;
    fiber_g: number | null;
    sodium_mg: number | null;
  }>;
}

/** 拍照 job 回傳（物件或陣列）→ 與手動 AI 相同結構；UI 只使用第一筆。 */
function parsePhotoJobResult(json: Json | null): ManualFoodAnalysisResult | null {
  if (json == null) return null;
  const rows: unknown[] = Array.isArray(json) ? json : [json];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    if (!name) continue;
    const quantity_g = Math.round(Number(o.quantity_g ?? 0));
    const qd = String(o.quantity_description ?? '').trim();
    const fiberRaw = o.fiber_g;
    const sodiumRaw = o.sodium_mg;
    return {
      name,
      quantity_g: quantity_g > 0 ? quantity_g : 100,
      quantity_description: qd || (quantity_g > 0 ? `${quantity_g}g` : '1份'),
      calories: Math.round(Number(o.calories ?? 0)),
      protein_g: Math.round(Number(o.protein_g ?? 0)),
      carb_g: Math.round(Number(o.carb_g ?? 0)),
      fat_g: Math.round(Number(o.fat_g ?? 0)),
      fiber_g:
        fiberRaw === null || fiberRaw === undefined || fiberRaw === ''
          ? null
          : Math.round(Number(fiberRaw)),
      sodium_mg:
        sodiumRaw === null || sodiumRaw === undefined || sodiumRaw === ''
          ? null
          : Math.round(Number(sodiumRaw)),
    };
  }
  return null;
}

function roundMacroG(n: number): number {
  return Math.round(Number(n));
}

function logItemToManualResult(it: LogItemSnapshot): ManualFoodAnalysisResult {
  const q = Math.round(Number(it.quantity_g));
  return {
    name: it.name,
    quantity_g: q > 0 ? q : 1,
    quantity_description: '',
    calories: Math.round(Number(it.calories)),
    protein_g: Math.round(Number(it.protein_g)),
    carb_g: Math.round(Number(it.carb_g)),
    fat_g: Math.round(Number(it.fat_g)),
    fiber_g: it.fiber_g,
    sodium_mg: it.sodium_mg,
  };
}

function ItemMacrosMutedLine(props: {
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
}) {
  const kcal = Math.round(Number(props.calories));
  const c = roundMacroG(props.carb_g);
  const p = roundMacroG(props.protein_g);
  const f = roundMacroG(props.fat_g);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1 text-[11px] font-normal leading-snug text-muted-foreground">
      <span className="tabular-nums">{kcal}</span>
      <span>kcal</span>
      <span>·</span>
      <span className="tabular-nums">碳水{c}g</span>
      <span>·</span>
      <span className="tabular-nums">蛋白{p}g</span>
      <span>·</span>
      <span className="tabular-nums">脂肪{f}g</span>
    </span>
  );
}

function TrashIcon(props: { className?: string }) {
  return <FiTrash2 className={props.className} aria-hidden />;
}

function secondaryExpandable(it: LogItemSnapshot): boolean {
  const fiberEmpty =
    it.fiber_g === null || roundMacroG(Number(it.fiber_g)) === 0;
  const sodiumEmpty =
    it.sodium_mg === null || roundMacroG(Number(it.sodium_mg)) === 0;
  return !fiberEmpty || !sodiumEmpty;
}

function formatFiber(it: LogItemSnapshot): string {
  if (it.fiber_g === null) return '—';
  return `${roundMacroG(Number(it.fiber_g))}g`;
}

function formatSodium(it: LogItemSnapshot): string {
  if (it.sodium_mg === null) return '—';
  return `${roundMacroG(Number(it.sodium_mg))}mg`;
}

function LogItemNutrition({ item }: { item: LogItemSnapshot }) {
  const [open, setOpen] = useState(false);
  const showMore = secondaryExpandable(item);

  return (
    <div className="mt-1 space-y-0">
      <div>
        <ItemMacrosMutedLine
          calories={item.calories}
          carb_g={item.carb_g}
          protein_g={item.protein_g}
          fat_g={item.fat_g}
        />
      </div>
      {showMore ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="mt-0.5 block text-left text-[11px] font-normal leading-snug text-muted-foreground transition-opacity hover:opacity-80"
          >
            {open ? '收合 ‹' : '更多 ›'}
          </button>
          <div
            className="overflow-hidden transition-[max-height] duration-[150ms] ease-[ease]"
            style={{ maxHeight: open ? 96 : 0 }}
          >
            <p className="pt-1 text-[11px] font-normal leading-snug text-muted-foreground">
              纖維 {formatFiber(item)} · 鈉 {formatSodium(item)}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function totalDayKcalFromLogs(logs: FoodLogSnapshot[]): number {
  let t = 0;
  for (const log of logs) {
    for (const it of log.food_log_items ?? []) {
      t += Number(it.calories);
    }
  }
  return t;
}

function patchLogItemInLogs(
  logs: FoodLogSnapshot[],
  itemId: string,
  patch: Partial<LogItemSnapshot>,
): FoodLogSnapshot[] {
  return logs.map((log) => ({
    ...log,
    food_log_items:
      log.food_log_items?.map((row) =>
        row.id === itemId ? { ...row, ...patch } : row,
      ) ?? null,
  }));
}

interface LogClientProps {
  date: string;
  dailyCalTarget: number | null;
  initialLogs: FoodLogSnapshot[];
  /** URL `meal_type`，無預填時用來選預設餐次 Tab */
  initialMealTab?: MealType | null;
  prefillFromMeal?: PlanPrefillPayload | null;
}

type PlanItemShape = PlanPrefillPayload['items'][number];

type ExtraDraftLine = {
  base: PlanItemShape;
  row: PlanItemShape;
};

function clonePrefillItems(
  p: PlanPrefillPayload,
): PlanPrefillPayload['items'] {
  return p.items.map((i) => ({ ...i }));
}

function scaleMacrosFromBaseline(
  base: PlanPrefillPayload['items'][number],
  newQty: number,
): PlanPrefillPayload['items'][number] {
  const q0 = Number(base.quantity_g);
  const safeQ = Number.isFinite(newQty) && newQty > 0 ? newQty : q0;
  const factor = q0 > 0 ? safeQ / q0 : 1;
  return {
    ...base,
    quantity_g: safeQ,
    calories: Math.round(Number(base.calories) * factor),
    carb_g: Math.round(Number(base.carb_g) * factor * 10) / 10,
    protein_g: Math.round(Number(base.protein_g) * factor * 10) / 10,
    fat_g: Math.round(Number(base.fat_g) * factor * 10) / 10,
    fiber_g:
      base.fiber_g == null
        ? null
        : Math.round(Number(base.fiber_g) * factor * 10) / 10,
    sodium_mg:
      base.sodium_mg == null
        ? null
        : Math.round(Number(base.sodium_mg) * factor),
  };
}

export function LogClient({
  date,
  dailyCalTarget,
  initialLogs,
  initialMealTab = null,
  prefillFromMeal = null,
}: LogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mealTab, setMealTab] = useState<MealType>(() =>
    initialMealTab ??
      (prefillFromMeal?.mealType as MealType | undefined) ??
      'breakfast',
  );
  const [inputMode, setInputMode] = useState<'manual' | 'photo'>('manual');

  const [actionError, setActionError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [photoResult, setPhotoResult] =
    useState<ManualFoodAnalysisResult | null>(null);
  const [photoHint, setPhotoHint] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoPreviewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const originalsRef = useRef(
    prefillFromMeal ? clonePrefillItems(prefillFromMeal) : [],
  );
  const [prefillDraft, setPrefillDraft] = useState<
    PlanPrefillPayload['items']
  >(() =>
    prefillFromMeal ? clonePrefillItems(prefillFromMeal) : [],
  );
  const [prefillBusy, setPrefillBusy] = useState(false);
  const [prefillErr, setPrefillErr] = useState<string | null>(null);

  const [extraDraftLines, setExtraDraftLines] = useState<ExtraDraftLine[]>([]);
  const [showExtraSearch, setShowExtraSearch] = useState(false);

  const [dayLogs, setDayLogs] = useState(initialLogs);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    setDayLogs(initialLogs);
  }, [initialLogs]);

  const todayTotal = useMemo(() => totalDayKcalFromLogs(dayLogs), [dayLogs]);

  const applyPhotoJobUpdate = useCallback(
    (row: {
      status?: string;
      result_json?: Json | null;
      error_message?: string | null;
    }) => {
      const st = row.status ?? '';
      setJobStatus(st);
      if (st === 'ready') {
        const one = parsePhotoJobResult(row.result_json ?? null);
        setPhotoResult(one);
        setPhotoError(null);
        return;
      }
      if (st === 'error') {
        setPhotoError(row.error_message ?? '辨識失敗');
        setPhotoResult(null);
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
        photoPreviewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!activeJobId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`photo-job-${activeJobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'photo_analysis_jobs',
          filter: `id=eq.${activeJobId}`,
        },
        (payload) => {
          applyPhotoJobUpdate(
            payload.new as {
              status?: string;
              result_json?: Json | null;
              error_message?: string | null;
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeJobId, applyPhotoJobUpdate]);

  useEffect(() => {
    if (!activeJobId) return;

    const supabase = createClient();
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 120;
    const intervalMs = 1500;

    async function pollOnce(): Promise<boolean> {
      const { data: row } = await supabase
        .from('photo_analysis_jobs')
        .select('status,result_json,error_message')
        .eq('id', activeJobId)
        .maybeSingle();

      if (cancelled || !row) return false;

      const st = row.status ?? '';
      applyPhotoJobUpdate(row);
      return st === 'ready' || st === 'error';
    }

    let iv: number | undefined;

    iv = window.setInterval(() => {
      void (async () => {
        attempts++;
        const done = await pollOnce();
        if (done || attempts >= maxAttempts) {
          if (iv !== undefined) window.clearInterval(iv);
        }
      })();
    }, intervalMs);

    void pollOnce().then((done) => {
      if (done && iv !== undefined) window.clearInterval(iv);
    });

    return () => {
      cancelled = true;
      if (iv !== undefined) window.clearInterval(iv);
    };
  }, [activeJobId, applyPhotoJobUpdate]);

  const grouped = useMemo(() => {
    const map = new Map<string, FoodLogSnapshot[]>();
    for (const k of MEAL_ORDER) map.set(k, []);
    for (const log of dayLogs) {
      const key = log.meal_type in MEAL_LABEL ? log.meal_type : 'snack';
      const arr = map.get(key);
      if (arr) arr.push(log);
    }
    return map;
  }, [dayLogs]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleSaveEditedItem = useCallback(
    async (itemId: string, edited: ManualFoodAnalysisResult) => {
      setEditSaving(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('food_log_items')
        .update({
          name: edited.name.trim() || '未命名',
          quantity_g: edited.quantity_g,
          calories: edited.calories,
          protein_g: edited.protein_g,
          carb_g: edited.carb_g,
          fat_g: edited.fat_g,
          fiber_g: edited.fiber_g,
          sodium_mg: edited.sodium_mg,
        })
        .eq('id', itemId);

      setEditSaving(false);
      if (error) {
        setActionError(error.message);
        return;
      }

      setDayLogs((prev) =>
        patchLogItemInLogs(prev, itemId, {
          name: edited.name.trim() || '未命名',
          quantity_g: edited.quantity_g,
          calories: edited.calories,
          protein_g: edited.protein_g,
          carb_g: edited.carb_g,
          fat_g: edited.fat_g,
          fiber_g: edited.fiber_g,
          sodium_mg: edited.sodium_mg,
        }),
      );
      setExpandedItemId(null);
      setActionError(null);
    },
    [],
  );

  useEffect(() => {
    if (!prefillFromMeal) return;
    setMealTab(prefillFromMeal.mealType);
    const next = clonePrefillItems(prefillFromMeal);
    originalsRef.current = next;
    setPrefillDraft(next);
    setPrefillErr(null);
    setExtraDraftLines([]);
    setShowExtraSearch(false);
  }, [prefillFromMeal]);

  useEffect(() => {
    if (prefillFromMeal) return;
    const m = searchParams.get('meal_type');
    if (
      m === 'breakfast' ||
      m === 'lunch' ||
      m === 'dinner' ||
      m === 'snack'
    ) {
      setMealTab(m);
    }
  }, [searchParams, prefillFromMeal]);

  useEffect(() => {
    if (prefillFromMeal) return;
    if (initialMealTab) setMealTab(initialMealTab);
  }, [initialMealTab, prefillFromMeal]);

  function stagedFoodToPlanShape(item: StagedFoodItemForPlan): PlanItemShape {
    return {
      name: item.name,
      quantity_g: item.quantity_g,
      calories: item.calories,
      carb_g: item.carb_g,
      protein_g: item.protein_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g,
      sodium_mg: item.sodium_mg,
    };
  }

  async function onCommitPrefill() {
    if (!prefillFromMeal) return;
    const merged: PlanItemShape[] = [
      ...prefillDraft,
      ...extraDraftLines.map((l) => l.row),
    ];
    if (!merged.length) {
      setPrefillErr('請至少保留或加入一項食材');
      return;
    }
    setPrefillBusy(true);
    setPrefillErr(null);
    const err = await commitPrefillFromPlanAction({
      mealId: prefillFromMeal.mealId,
      date,
      mealType: prefillFromMeal.mealType,
      items: merged,
    });
    setPrefillBusy(false);
    if (err.error) {
      setPrefillErr(err.error);
      return;
    }
    router.back();
  }

  async function onDeleteLog(logId: string) {
    const err = await deleteFoodLogAction(logId);
    if (err.error) {
      setActionError(err.error);
      return;
    }
    refresh();
  }

  function clearLocalPhotoPreview() {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = null;
    }
    setPhotoPreviewUrl(null);
  }

  async function onPhotoFile(file: File | null) {
    if (!file) return;
    setPhotoError(null);
    setPhotoResult(null);
    setPhotoHint(null);
    setJobStatus(null);
    setActiveJobId(null);
    clearLocalPhotoPreview();
    const objectUrl = URL.createObjectURL(file);
    photoPreviewUrlRef.current = objectUrl;
    setPhotoPreviewUrl(objectUrl);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPhotoError('未登入');
      return;
    }

    setPhotoBusy(true);
    let uploadFile: File;
    try {
      uploadFile = await compressImageForUpload(file);
    } catch (e) {
      setPhotoBusy(false);
      setPhotoError(e instanceof Error ? e.message : '圖片處理失敗');
      return;
    }

    const ext =
      uploadFile.name.split('.').pop()?.toLowerCase() ??
      (uploadFile.type === 'image/png'
        ? 'png'
        : uploadFile.type === 'image/webp'
          ? 'webp'
          : 'jpg');
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
      ? ext === 'jpeg'
        ? 'jpg'
        : ext
      : 'jpg';

    const path = `${user.id}/${Date.now()}.${safeExt}`;
    const mime =
      uploadFile.type ||
      (safeExt === 'png'
        ? 'image/png'
        : safeExt === 'webp'
          ? 'image/webp'
          : 'image/jpeg');

    const { error: upErr } = await supabase.storage
      .from('food-photos')
      .upload(path, uploadFile, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      setPhotoBusy(false);
      setPhotoError(upErr.message);
      return;
    }

    const inv = await invokeAiPhotoRequestFromBrowser(path);
    setPhotoBusy(false);

    if (inv.error) {
      setPhotoError(inv.error);
      return;
    }

    if (inv.hint) setPhotoHint(inv.hint);
    const jid = inv.jobId ?? null;
    setActiveJobId(jid);
    setJobStatus('pending');

    if (jid) {
      const { data: row } = await supabase
        .from('photo_analysis_jobs')
        .select('status,result_json,error_message')
        .eq('id', jid)
        .maybeSingle();

      if (row) applyPhotoJobUpdate(row);
    }
  }

  async function onConfirmPhoto(edited: ManualFoodAnalysisResult) {
    setAddBusy(true);
    const err = await confirmPhotoItemsAction({
      mealType: mealTab,
      date,
      items: [
        {
          name: edited.name,
          quantity_g: edited.quantity_g,
          calories: edited.calories,
          carb_g: edited.carb_g,
          protein_g: edited.protein_g,
          fat_g: edited.fat_g,
          fiber_g: edited.fiber_g,
          sodium_mg: edited.sodium_mg,
        },
      ],
    });
    setAddBusy(false);
    if (err.error) {
      setPhotoError(err.error);
      return;
    }
    setPhotoResult(null);
    clearLocalPhotoPreview();
    setActiveJobId(null);
    setJobStatus(null);
    refresh();
  }

  function handlePhotoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    void onPhotoFile(file);
  }

  const photoWaitingAnalysis =
    !!photoPreviewUrl &&
    !photoResult &&
    (photoBusy ||
      (!!activeJobId &&
        jobStatus !== null &&
        jobStatus !== 'ready' &&
        jobStatus !== 'error'));

  const mealPillPrimary =
    'h-9 shrink-0 rounded-full px-4 text-[13px] font-medium border-[0.5px] border-transparent';
  const mealPillInactive =
    'h-9 shrink-0 rounded-full px-4 text-[13px] font-medium border-[0.5px] border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl border-[0.5px] border-border bg-card px-4 py-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">今日已攝取</p>
            <p className="tabular-nums text-[20px] font-medium leading-tight text-foreground">
              {Math.round(todayTotal)}
              <span className="text-[13px] font-normal text-muted-foreground"> kcal</span>
            </p>
          </div>
          <div className="text-right">
            {dailyCalTarget != null ? (
              <p className="text-[11px] text-muted-foreground">
                目標 {Math.round(Number(dailyCalTarget))} kcal
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">尚未設定熱量目標</p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground">{date}</p>
          </div>
        </div>
      </div>

      {prefillFromMeal ? (
        <div className="space-y-4">
          <div className="rounded-xl border-[0.5px] border-primary-light bg-primary-light p-3.5">
            <p className="text-[13px] leading-snug text-foreground">
              從計畫帶入：
              {MEAL_LABEL[prefillFromMeal.mealType]}
              的食材，可以直接編輯調整
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-[15px] font-medium text-foreground">
              計畫食材（可調整）
            </h2>
            {prefillErr ? (
              <p className="text-[13px] text-destructive">{prefillErr}</p>
            ) : null}

            <ul className="space-y-2.5">
              {prefillDraft.map((it, idx) => (
                <li
                  key={`prefill-${idx}`}
                  className="flex items-start gap-2 rounded-xl border-[0.5px] border-border bg-card p-3"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="block text-[11px] text-muted-foreground">
                      名稱
                    </label>
                    <Input
                      className="mt-1"
                      value={it.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPrefillDraft((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, name: v } : row,
                          ),
                        );
                      }}
                    />
                    <div className="flex flex-wrap items-end gap-3 pt-1">
                      <div className="w-[min(100%,132px)]">
                        <label className="block text-[11px] text-muted-foreground">
                          份量（g）
                        </label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          className="mt-1 tabular-nums"
                          value={Math.round(it.quantity_g)}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            const base = originalsRef.current[idx];
                            if (!base) return;
                            const scaled = scaleMacrosFromBaseline(base, raw);
                            setPrefillDraft((prev) =>
                              prev.map((row, i) =>
                                i === idx ? scaled : row,
                              ),
                            );
                          }}
                        />
                      </div>
                      <div className="pb-0.5">
                        <p className="text-[11px] text-muted-foreground">
                          熱量
                        </p>
                        <p className="tabular-nums text-[15px] font-medium text-foreground">
                          {Math.round(it.calories)}{' '}
                          <span className="text-[13px] font-normal text-muted-foreground">
                            kcal
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-6 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="移除此項"
                    onClick={() => {
                      setPrefillDraft((prev) =>
                        prev.filter((_, i) => i !== idx),
                      );
                      originalsRef.current = originalsRef.current.filter(
                        (_, i) => i !== idx,
                      );
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            {extraDraftLines.length > 0 ? (
              <div className="space-y-2 pt-2">
                <p className="text-[13px] font-medium text-foreground">
                  額外加入
                </p>
                <ul className="space-y-2.5">
                  {extraDraftLines.map((line, idx) => (
                    <li
                      key={`extra-${idx}`}
                      className="flex items-start gap-2 rounded-xl border-[0.5px] border-border bg-card p-3"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-[13px] font-medium text-foreground">
                          {line.row.name}
                        </p>
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="w-[min(100%,132px)]">
                            <label className="block text-[11px] text-muted-foreground">
                              份量（g）
                            </label>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              className="mt-1 tabular-nums"
                              value={Math.round(line.row.quantity_g)}
                              onChange={(e) => {
                                const raw = Number(e.target.value);
                                const scaled = scaleMacrosFromBaseline(
                                  line.base,
                                  raw,
                                );
                                setExtraDraftLines((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, row: scaled } : l,
                                  ),
                                );
                              }}
                            />
                          </div>
                          <div className="pb-0.5">
                            <p className="text-[11px] text-muted-foreground">
                              熱量
                            </p>
                            <p className="tabular-nums text-[15px] font-medium text-foreground">
                              {Math.round(line.row.calories)}{' '}
                              <span className="text-[13px] font-normal text-muted-foreground">
                                kcal
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="移除此項"
                        onClick={() =>
                          setExtraDraftLines((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="w-full border-[0.5px]"
              onClick={() => setShowExtraSearch((v) => !v)}
            >
              {showExtraSearch ? '收合' : '新增其他食物'}
            </Button>

            {showExtraSearch ? (
              <div className="space-y-3 rounded-xl border-[0.5px] border-border bg-card p-4">
                <p className="text-[13px] text-muted-foreground">
                  餐次：{MEAL_LABEL[prefillFromMeal.mealType]}
                </p>
                <AddFoodManualAiPanel
                  mealType={prefillFromMeal.mealType}
                  mealLabelZh={MEAL_LABEL[prefillFromMeal.mealType]}
                  date={date}
                  stagingOnly
                  onStagedItem={(item) => {
                    const shape = stagedFoodToPlanShape(item);
                    setExtraDraftLines((prev) => [
                      ...prev,
                      { base: { ...shape }, row: { ...shape } },
                    ]);
                    setPrefillErr(null);
                  }}
                  onCommitted={() => {}}
                  onError={(msg) => setPrefillErr(msg)}
                />
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full"
              disabled={
                prefillBusy ||
                (prefillDraft.length === 0 && extraDraftLines.length === 0)
              }
              onClick={() => void onCommitPrefill()}
            >
              {prefillBusy ? '存檔中…' : '確認存檔'}
            </Button>
          </div>
        </div>
      ) : null}

      {!prefillFromMeal ? (
      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>新增紀錄</CardTitle>
          <CardDescription>
            選擇餐次後，以文字描述或拍照加入今日飲食。
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-3 overflow-x-hidden">
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              選擇餐次
            </p>
            <div className="flex flex-wrap gap-2">
              {MEAL_ORDER.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={mealTab === m ? 'default' : 'ghost'}
                  className={
                    mealTab === m ? mealPillPrimary : mealPillInactive
                  }
                  onClick={() => setMealTab(m)}
                >
                  {MEAL_LABEL[m]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              選擇輸入方式
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={inputMode === 'manual' ? 'default' : 'ghost'}
                className={
                  inputMode === 'manual' ? mealPillPrimary : mealPillInactive
                }
                onClick={() => setInputMode('manual')}
              >
                手動輸入
              </Button>
              <Button
                type="button"
                variant={inputMode === 'photo' ? 'default' : 'ghost'}
                className={
                  inputMode === 'photo' ? mealPillPrimary : mealPillInactive
                }
                onClick={() => setInputMode('photo')}
              >
                拍照辨識
              </Button>
            </div>
          </div>

          {inputMode === 'manual' ? (
            <div key="input-mode-manual" className="space-y-3">
              {actionError ? (
                <p className="text-[13px] text-destructive">{actionError}</p>
              ) : null}
              <AddFoodManualAiPanel
                mealType={mealTab}
                mealLabelZh={MEAL_LABEL[mealTab]}
                date={date}
                onError={(msg) => setActionError(msg)}
                onCommitted={() => {
                  setActionError(null);
                  refresh();
                }}
              />
            </div>
          ) : (
            <div key="input-mode-photo" className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoFileChange}
              />

              {!photoPreviewUrl ?
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border-[0.5px] border-dashed border-primary-light bg-primary-light py-8 transition-colors active:bg-secondary"
                >
                  <FiCamera className="h-8 w-8 text-primary" aria-hidden />
                  <span className="text-[13px] font-medium text-primary">
                    拍照或選擇相片
                  </span>
                  <span className="text-[11px] text-neutral-text-tertiary">支援 JPG、PNG</span>
                </button>
              : !photoResult ?
                <div className="relative w-full overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreviewUrl}
                    alt="預覽"
                    className="h-48 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-2 top-2 rounded-full bg-[#1E212B]/70 px-3 py-1 text-[11px] text-white transition-opacity hover:opacity-90"
                  >
                    重新選擇
                  </button>
                </div>
              : null}

              {photoBusy ?
                <p className="text-[13px] text-muted-foreground">
                  上傳並排入分析…
                </p>
              : null}
              {photoHint ?
                <p className="text-[11px] text-amber-600">{photoHint}</p>
              : null}

              {photoWaitingAnalysis ?
                <div className="space-y-3 rounded-xl border-[0.5px] border-neutral-border-tertiary bg-card p-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 w-1/3 rounded-full bg-neutral-border-tertiary" />
                    <div className="h-3 w-1/2 rounded-full bg-neutral-border-tertiary" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 animate-pulse">
                    <div className="h-20 rounded-xl bg-neutral-border-tertiary" />
                    <div className="h-20 rounded-xl bg-neutral-border-tertiary" />
                    <div className="h-20 rounded-xl bg-neutral-border-tertiary" />
                    <div className="h-20 rounded-xl bg-neutral-border-tertiary" />
                  </div>
                  <div className="h-10 animate-pulse rounded-[10px] bg-neutral-border-tertiary" />
                  <p className="text-center text-[11px] text-neutral-text-tertiary">
                    AI 辨識中，請稍候...
                  </p>
                </div>
              : null}

              {photoError ? (
                <p className="text-[13px] text-destructive">{photoError}</p>
              ) : null}

              {photoResult ? (
                <NutritionResultCard
                  result={photoResult}
                  mealLabelZh={MEAL_LABEL[mealTab]}
                  previewImageUrl={photoPreviewUrl ?? undefined}
                  confirmBusy={addBusy}
                  onConfirm={(edited) => void onConfirmPhoto(edited)}
                />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}

      <div className="space-y-2.5">
        <h2 className="text-[15px] font-medium text-foreground">今日紀錄</h2>
        <div className="space-y-3">
          {MEAL_ORDER.map((m) => {
            const mealLogs = grouped.get(m) ?? [];
            return (
              <section key={m}>
                <h3 className="text-[13px] font-medium text-foreground">
                  {MEAL_LABEL[m]}
                </h3>
                {mealLogs.length === 0 ? (
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    尚無紀錄
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2.5">
                    {mealLogs.map((log) => (
                      <li key={log.id}>
                        <div className="flex overflow-hidden rounded-xl border-[0.5px] border-border bg-card">
                          <div className="min-w-0 flex-1 divide-y-[0.5px] divide-border">
                            {(log.food_log_items ?? []).map((it) => (
                              <div key={it.id} className="flex flex-col">
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className="flex w-full cursor-pointer gap-2 p-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-[#4C956C]/20"
                                  onClick={() =>
                                    setExpandedItemId((prev) =>
                                      prev === it.id ? null : it.id,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setExpandedItemId((prev) =>
                                        prev === it.id ? null : it.id,
                                      );
                                    }
                                  }}
                                >
                                  <span
                                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4C956C]"
                                    aria-hidden
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-medium text-foreground">
                                      {it.name}{' '}
                                      <span className="text-[11px] font-normal text-muted-foreground">
                                        {Math.round(Number(it.quantity_g))}g
                                      </span>
                                    </div>
                                    <LogItemNutrition item={it} />
                                  </div>
                                </div>
                                <div
                                  className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
                                  style={{
                                    maxHeight:
                                      expandedItemId === it.id ? 1400 : 0,
                                  }}
                                >
                                  {expandedItemId === it.id ?
                                    <div className="rounded-b-xl border-t-[0.5px] border-neutral-border-tertiary bg-secondary p-4">
                                      <NutritionResultCard
                                        key={`${it.id}-${it.calories}-${it.quantity_g}`}
                                        embedded
                                        editMode
                                        editBusy={editSaving}
                                        result={logItemToManualResult(it)}
                                        onCancel={() =>
                                          setExpandedItemId(null)
                                        }
                                        onConfirm={(edited) =>
                                          void handleSaveEditedItem(
                                            it.id,
                                            edited,
                                          )
                                        }
                                      />
                                    </div>
                                  : null}
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="shrink-0 self-stretch border-l-[0.5px] border-border px-3 py-3 text-muted-foreground transition-colors hover:text-destructive"
                            aria-label="刪除此筆紀錄"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onDeleteLog(log.id);
                            }}
                          >
                            <TrashIcon className="mx-auto h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
