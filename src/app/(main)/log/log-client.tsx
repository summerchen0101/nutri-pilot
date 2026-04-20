'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AddFoodFromSearchPanel,
  FoodSourceDotInline,
  type StagedFoodItemForPlan,
} from '@/app/(main)/log/add-food-from-search';
import {
  commitPrefillFromPlanAction,
  confirmPhotoItemsAction,
  deleteFoodLogAction,
  searchFoodsAction,
} from '@/app/(main)/log/actions';
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
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import type { FoodCacheRow } from '@/lib/food/search';
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

interface PhotoPreviewItem {
  name: string;
  quantity_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
}

function parsePhotoItems(json: Json | null): PhotoPreviewItem[] | null {
  if (!json || !Array.isArray(json)) return null;
  const out: PhotoPreviewItem[] = [];
  for (const row of json) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    if (!name) continue;
    out.push({
      name,
      quantity_g: Number(o.quantity_g ?? 0),
      calories: Number(o.calories ?? 0),
      carb_g: Number(o.carb_g ?? 0),
      protein_g: Number(o.protein_g ?? 0),
      fat_g: Number(o.fat_g ?? 0),
    });
  }
  return out.length ? out : null;
}

function roundMacroG(n: number): number {
  return Math.round(Number(n));
}

/** 來源色點：資料庫未持久化來源別，拍照／未驗證視為 AI，已驗證搜尋視為衛福部快取為主（USDA 與本地快取皆以已驗證綠點呈現）。 */
function sourceDotColor(method: string, item: LogItemSnapshot): string {
  if (method === 'from_plan') return '#4C956C';
  if (method === 'photo') return '#EF9F27';
  if (method === 'search') {
    if (item.is_verified === false || item.is_verified === null) {
      return '#EF9F27';
    }
    return '#4C956C';
  }
  return '#94a3b8';
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
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={props.className}
      aria-hidden
    >
      <path
        d="M4 7h16M10 11v6M14 11v6M9 7V5c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v2"
        strokeLinecap="round"
      />
      <path d="M10 21h4c1.1 0 2-.9 2-2V9H8v10c0 1.1.9 2 2 2z" />
    </svg>
  );
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
            onClick={() => setOpen((v) => !v)}
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

function totalDayKcal(logs: FoodLogSnapshot[]): number {
  let t = 0;
  for (const log of logs) {
    for (const it of log.food_log_items ?? []) {
      t += Number(it.calories);
    }
  }
  return t;
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
  const [inputMode, setInputMode] = useState<'search' | 'photo'>('search');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<FoodCacheRow[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedHit, setSelectedHit] = useState<FoodCacheRow | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<PhotoPreviewItem[] | null>(
    null,
  );
  const [photoHint, setPhotoHint] = useState<string | null>(null);

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

  const todayTotal = useMemo(() => totalDayKcal(initialLogs), [initialLogs]);

  const applyPhotoJobUpdate = useCallback(
    (row: {
      status?: string;
      result_json?: Json | null;
      error_message?: string | null;
    }) => {
      const st = row.status ?? '';
      setJobStatus(st);
      if (st === 'ready') {
        const items = parsePhotoItems(row.result_json ?? null);
        setPhotoPreview(items);
        setPhotoError(null);
        return;
      }
      if (st === 'error') {
        setPhotoError(row.error_message ?? '辨識失敗');
        setPhotoPreview(null);
      }
    },
    [],
  );

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchHits([]);
      setSearchError(null);
      return;
    }

    const t = window.setTimeout(() => {
      void (async () => {
        setSearchBusy(true);
        setSearchError(null);
        const res = await searchFoodsAction(q);
        setSearchBusy(false);
        if ('error' in res && res.error) setSearchError(res.error);
        setSearchHits(res.results ?? []);
      })();
    }, 380);

    return () => window.clearTimeout(t);
  }, [searchQuery]);

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
    for (const log of initialLogs) {
      const key = log.meal_type in MEAL_LABEL ? log.meal_type : 'snack';
      const arr = map.get(key);
      if (arr) arr.push(log);
    }
    return map;
  }, [initialLogs]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

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
      setSearchError(err.error);
      return;
    }
    refresh();
  }

  async function onPhotoFile(file: File | null) {
    if (!file) return;
    setPhotoError(null);
    setPhotoPreview(null);
    setPhotoHint(null);
    setJobStatus(null);
    setActiveJobId(null);

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

  async function onConfirmPhoto() {
    if (!photoPreview?.length) return;
    setAddBusy(true);
    const err = await confirmPhotoItemsAction({
      mealType: mealTab,
      date,
      items: photoPreview,
    });
    setAddBusy(false);
    if (err.error) {
      setPhotoError(err.error);
      return;
    }
    setPhotoPreview(null);
    setActiveJobId(null);
    setJobStatus(null);
    refresh();
  }

  const pillPrimary =
    'h-9 shrink-0 rounded-full px-4 text-[13px] font-medium border-[0.5px] border-transparent';
  const pillInactive =
    'h-9 shrink-0 rounded-full px-4 text-[13px] font-medium border-[0.5px] border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href="/plan"
          className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← 飲食計畫
        </Link>
        <p className="max-w-[min(100%,220px)] text-right text-[13px] leading-snug text-muted-foreground">
          <span className="block tabular-nums text-foreground">
            <span className="text-xl font-medium">{Math.round(todayTotal)}</span>
            <span className="font-normal text-muted-foreground"> kcal</span>
          </span>
          {dailyCalTarget != null ? (
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              目標 {Math.round(Number(dailyCalTarget))} kcal · {date}
            </span>
          ) : (
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {date}
            </span>
          )}
        </p>
      </div>

      {prefillFromMeal ? (
        <div className="space-y-4">
          <div className="rounded-xl border-[0.5px] border-[#C8E6D4] bg-[#EBF5EF] p-3.5">
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
                    className="mt-6 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-[#E55A3C]"
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
                        className="mt-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-[#E55A3C]"
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
              {showExtraSearch ? '收合搜尋' : '新增其他食物'}
            </Button>

            {showExtraSearch ? (
              <div className="space-y-3 rounded-xl border-[0.5px] border-border bg-card p-4">
                <p className="text-[13px] text-muted-foreground">
                  餐次：{MEAL_LABEL[prefillFromMeal.mealType]}
                </p>
                <Input
                  placeholder="輸入食品名稱（至少 2 字）"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchBusy ? (
                  <p className="text-[11px] text-muted-foreground">
                    搜尋中…
                  </p>
                ) : null}

                {searchHits.length > 0 ? (
                  <ul
                    role="list"
                    className={cn(
                      'flex w-full min-w-0 list-none flex-col gap-1 overflow-x-hidden rounded-xl border-[0.5px] border-border bg-secondary p-2',
                      searchHits.length > 7 ?
                        'max-h-56 overflow-y-auto'
                      : 'overflow-y-visible',
                    )}
                  >
                    {searchHits.map((h, i) => (
                      <li key={`prefill-hit-${h.id}-${i}`} className="min-w-0 shrink-0">
                        <button
                          type="button"
                          className={cn(
                            'flex w-full max-w-full gap-2 rounded-[10px] border-[0.5px] px-3 py-2 text-left transition-colors duration-150',
                            h.brand ? 'items-start' : 'items-center',
                            selectedHit?.id === h.id
                              ? 'border-[#4C956C] bg-[#E8F5EE]'
                              : 'border-transparent hover:bg-muted',
                          )}
                          onClick={() => setSelectedHit(h)}
                        >
                          <span
                            className={cn(
                              'shrink-0',
                              h.brand ? 'mt-0.5' : '',
                            )}
                            aria-hidden
                          >
                            <FoodSourceDotInline row={h} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-[13px] font-normal leading-snug text-foreground">
                              {h.name}
                            </p>
                            {h.brand ? (
                              <p className="mt-0.5 break-words text-[11px] leading-snug text-muted-foreground">
                                {h.brand}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {selectedHit ? (
                  <AddFoodFromSearchPanel
                    selectedHit={selectedHit}
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
                    onCommitted={() => {
                      setSelectedHit(null);
                      setSearchQuery('');
                      setSearchHits([]);
                    }}
                    onError={(msg) => setPrefillErr(msg)}
                  />
                ) : null}
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
            選擇餐次後，以搜尋或拍照加入今日飲食。
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 overflow-x-hidden">
          <div className="flex flex-wrap gap-2">
            {MEAL_ORDER.map((m) => (
              <Button
                key={m}
                type="button"
                variant={mealTab === m ? 'default' : 'ghost'}
                className={mealTab === m ? pillPrimary : pillInactive}
                onClick={() => setMealTab(m)}
              >
                {MEAL_LABEL[m]}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={inputMode === 'search' ? 'default' : 'ghost'}
              className={
                inputMode === 'search' ? pillPrimary : pillInactive
              }
              onClick={() => setInputMode('search')}
            >
              搜尋食品
            </Button>
            <Button
              type="button"
              variant={inputMode === 'photo' ? 'default' : 'ghost'}
              className={
                inputMode === 'photo' ? pillPrimary : pillInactive
              }
              onClick={() => setInputMode('photo')}
            >
              拍照辨識
            </Button>
          </div>

          {inputMode === 'search' ? (
            <div key="input-mode-search" className="space-y-3">
              <Input
                placeholder="輸入食品名稱（至少 2 字）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchBusy ? (
                <p className="text-[11px] text-muted-foreground">搜尋中…</p>
              ) : null}
              {searchError ? (
                <p className="text-[13px] text-destructive">{searchError}</p>
              ) : null}

              {searchHits.length > 0 ? (
                <ul
                  role="list"
                  className={cn(
                    'flex w-full min-w-0 list-none flex-col gap-1 overflow-x-hidden rounded-xl border-[0.5px] border-border bg-card p-2',
                    /* 項目少時高度貼齊內容；項目多時再限制高度並捲動，避免 ul 被撐成大片留白 */
                    searchHits.length > 7 ?
                      'max-h-56 overflow-y-auto'
                    : 'overflow-y-visible',
                  )}
                >
                  {searchHits.map((h, i) => (
                    <li key={`${h.id}-${i}`} className="min-w-0 shrink-0">
                      <button
                        type="button"
                        className={cn(
                          'flex w-full max-w-full gap-2 rounded-[10px] border-[0.5px] px-3 py-2 text-left transition-colors duration-150',
                          h.brand ? 'items-start' : 'items-center',
                          selectedHit?.id === h.id
                            ? 'border-[#4C956C] bg-[#E8F5EE]'
                            : 'border-transparent hover:bg-secondary',
                        )}
                        onClick={() => setSelectedHit(h)}
                      >
                        <span
                          className={cn(
                            'shrink-0',
                            h.brand ? 'mt-0.5' : '',
                          )}
                          aria-hidden
                        >
                          <FoodSourceDotInline row={h} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-[13px] font-normal leading-snug text-foreground">
                            {h.name}
                          </p>
                          {h.brand ? (
                            <p className="mt-0.5 break-words text-[11px] leading-snug text-muted-foreground">
                              {h.brand}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {selectedHit ? (
                <AddFoodFromSearchPanel
                  selectedHit={selectedHit}
                  mealType={mealTab}
                  mealLabelZh={MEAL_LABEL[mealTab]}
                  date={date}
                  onError={(msg) => setSearchError(msg)}
                  onCommitted={() => {
                    setSelectedHit(null);
                    setSearchQuery('');
                    setSearchHits([]);
                    refresh();
                  }}
                />
              ) : null}
            </div>
          ) : (
            <div key="input-mode-photo" className="space-y-3">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void onPhotoFile(e.target.files?.[0] ?? null)}
              />
              {photoBusy ? (
                <p className="text-[13px] text-muted-foreground">
                  上傳並排入分析…
                </p>
              ) : null}
              {photoHint ? (
                <p className="text-[11px] text-[#854F0B]">{photoHint}</p>
              ) : null}
              {activeJobId && jobStatus && jobStatus !== 'ready' ? (
                <div className="animate-pulse space-y-2 rounded-xl border-[0.5px] border-border bg-secondary p-4">
                  <div className="h-3 w-2/5 rounded-[10px] bg-muted" />
                  <div className="h-16 rounded-xl bg-muted/80" />
                  <p className="text-center text-[11px] text-muted-foreground">
                    AI 分析中（{jobStatus}）…
                  </p>
                </div>
              ) : null}
              {photoError ? (
                <p className="text-[13px] text-destructive">{photoError}</p>
              ) : null}

              {photoPreview?.length ? (
                <div className="space-y-3 rounded-xl border-[0.5px] border-border bg-card p-4">
                  <p className="text-[15px] font-medium text-foreground">
                    辨識結果（確認後寫入 {MEAL_LABEL[mealTab]}）
                  </p>
                  <ul className="space-y-2 text-[13px]">
                    {photoPreview.map((it, idx) => (
                      <li
                        key={`${it.name}-${idx}`}
                        className="flex justify-between gap-2 border-b-[0.5px] border-border pb-2 text-foreground last:border-b-0 last:pb-0"
                      >
                        <span className="min-w-0">
                          {it.name}{' '}
                          <span className="text-muted-foreground">
                            {Math.round(it.quantity_g)}g
                          </span>
                        </span>
                        <span className="tabular-nums shrink-0 text-[13px]">
                          <span className="font-medium text-foreground">
                            {Math.round(it.calories)}
                          </span>
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            kcal
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={addBusy}
                    onClick={() => void onConfirmPhoto()}
                  >
                    {addBusy ? '寫入中…' : '確認加入紀錄'}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-[15px] font-medium text-foreground">今日紀錄</h2>
        <div className="space-y-5">
          {MEAL_ORDER.map((m) => {
            const logs = grouped.get(m) ?? [];
            return (
              <section key={m}>
                <h3 className="text-[13px] font-medium text-foreground">
                  {MEAL_LABEL[m]}
                </h3>
                {logs.length === 0 ? (
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    尚無紀錄
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2.5">
                    {logs.map((log) => (
                      <li key={log.id}>
                        <div className="flex items-start gap-2 rounded-xl border-[0.5px] border-border bg-card p-3">
                          <div className="min-w-0 flex-1 space-y-3">
                            {(log.food_log_items ?? []).map((it) => (
                              <div key={it.id} className="flex gap-2">
                                <span
                                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: sourceDotColor(log.method, it),
                                  }}
                                  title={
                                    log.method === 'photo'
                                      ? 'AI 估算（拍照）'
                                      : it.is_verified
                                        ? '衛福部／資料庫'
                                        : 'AI 估算'
                                  }
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
                            ))}
                          </div>
                          <button
                            type="button"
                            className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-[#E55A3C]"
                            aria-label="刪除此筆紀錄"
                            onClick={() => void onDeleteLog(log.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
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
