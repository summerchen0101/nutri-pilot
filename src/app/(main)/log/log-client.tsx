'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  addFoodFromSearchAction,
  confirmPhotoItemsAction,
  deleteFoodLogAction,
  searchFoodsAction,
} from '@/app/(main)/log/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { invokeAiPhotoRequestFromBrowser } from '@/lib/food/invoke-photo-request';
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
  brand: string | null;
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

function FoodSourceBadge({ row }: { row: FoodCacheRow }) {
  if (row.source === 'ai_estimate') {
    return (
      <span className="mt-1 flex items-center gap-1 text-xs text-amber-800">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        AI 估算，請確認
      </span>
    );
  }
  if (row.is_verified && row.source === 'mohw_tw') {
    return (
      <span className="mt-1 flex items-center gap-1 text-xs text-emerald-800">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        衛福部
      </span>
    );
  }
  if (row.is_verified && row.source === 'usda') {
    return (
      <span className="mt-1 flex items-center gap-1 text-xs text-blue-800">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-blue-500" />
        USDA
      </span>
    );
  }
  return null;
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

function sumLogCalories(items: LogItemSnapshot[] | null): number {
  if (!items?.length) return 0;
  return items.reduce((s, it) => s + Number(it.calories), 0);
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
}

export function LogClient({
  date,
  dailyCalTarget,
  initialLogs,
}: LogClientProps) {
  const router = useRouter();
  const [mealTab, setMealTab] = useState<MealType>('breakfast');
  const [inputMode, setInputMode] = useState<'search' | 'photo'>('search');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<FoodCacheRow[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedHit, setSelectedHit] = useState<FoodCacheRow | null>(null);
  const [aiEstimateConfirmed, setAiEstimateConfirmed] = useState(false);
  const [quantityG, setQuantityG] = useState(100);
  const [addBusy, setAddBusy] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<PhotoPreviewItem[] | null>(
    null,
  );
  const [photoHint, setPhotoHint] = useState<string | null>(null);

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

  /** Realtime 未含此表時不會收到 UPDATE；輪詢後備避免畫面卡在 pending */
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
    setAiEstimateConfirmed(false);
  }, [selectedHit?.id]);

  async function onAddSearch() {
    if (!selectedHit) return;
    if (selectedHit.source === 'ai_estimate' && !aiEstimateConfirmed) return;
    setAddBusy(true);
    const err = await addFoodFromSearchAction({
      mealType: mealTab,
      date,
      quantityG,
      confirmedAiEstimate:
        selectedHit.source === 'ai_estimate' ? aiEstimateConfirmed : undefined,
      hit: {
        name: selectedHit.name,
        brand: selectedHit.brand,
        calories_per_100g: selectedHit.calories_per_100g,
        carb_g_per_100g: selectedHit.carb_g_per_100g,
        protein_g_per_100g: selectedHit.protein_g_per_100g,
        fat_g_per_100g: selectedHit.fat_g_per_100g,
        source: selectedHit.source,
      },
    });
    setAddBusy(false);
    if (err.error) {
      setSearchError(err.error);
      return;
    }
    setSelectedHit(null);
    setSearchQuery('');
    setSearchHits([]);
    refresh();
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

    const ext =
      file.name.split('.').pop()?.toLowerCase() ??
      (file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg');
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
      ? ext === 'jpeg'
        ? 'jpg'
        : ext
      : 'jpg';

    const path = `${user.id}/${Date.now()}.${safeExt}`;
    const mime =
      file.type ||
      (safeExt === 'png'
        ? 'image/png'
        : safeExt === 'webp'
          ? 'image/webp'
          : 'image/jpeg');

    setPhotoBusy(true);
    const { error: upErr } = await supabase.storage
      .from('food-photos')
      .upload(path, file, {
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/plan"
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
        >
          ← 飲食計畫
        </Link>
        <p className="text-sm text-slate-500">
          {date} · 今日熱量{' '}
          <span className="font-semibold text-slate-900">
            {Math.round(todayTotal)}
          </span>
          {dailyCalTarget != null ? (
            <>
              {' '}
              / 目標 {Math.round(Number(dailyCalTarget))} kcal
            </>
          ) : null}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增紀錄</CardTitle>
          <CardDescription>
            選擇餐次後，以搜尋或拍照加入今日飲食。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {MEAL_ORDER.map((m) => (
              <Button
                key={m}
                type="button"
                variant={mealTab === m ? 'default' : 'outline'}
                className="h-9 px-3 text-xs"
                onClick={() => setMealTab(m)}
              >
                {MEAL_LABEL[m]}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={inputMode === 'search' ? 'default' : 'outline'}
              className="h-9 px-3 text-xs"
              onClick={() => setInputMode('search')}
            >
              搜尋食品
            </Button>
            <Button
              type="button"
              variant={inputMode === 'photo' ? 'default' : 'outline'}
              className="h-9 px-3 text-xs"
              onClick={() => setInputMode('photo')}
            >
              拍照辨識
            </Button>
          </div>

          {inputMode === 'search' ? (
            <div className="space-y-3">
              <Input
                placeholder="輸入食品名稱（至少 2 字）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchBusy ? (
                <p className="text-xs text-slate-500">搜尋中…</p>
              ) : null}
              {searchError ? (
                <p className="text-sm text-red-600">{searchError}</p>
              ) : null}

              <ul className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {searchHits.map((h, i) => (
                  <li key={`${h.id}-${i}`}>
                    <button
                      type="button"
                      className={`w-full rounded-md px-2 py-2 text-left text-sm transition hover:bg-slate-100 ${
                        selectedHit?.id === h.id
                          ? 'bg-slate-100 ring-2 ring-slate-400'
                          : ''
                      }`}
                      onClick={() => setSelectedHit(h)}
                    >
                      <span className="font-medium text-slate-900">
                        {h.name}
                      </span>
                      {h.brand ? (
                        <span className="text-slate-500"> · {h.brand}</span>
                      ) : null}
                      <span className="block text-xs text-slate-500">
                        {Math.round(h.calories_per_100g)} kcal／100g
                      </span>
                      <FoodSourceBadge row={h} />
                    </button>
                  </li>
                ))}
              </ul>

              {selectedHit ? (
                <div className="space-y-3">
                  {selectedHit.source === 'ai_estimate' ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      <p className="font-medium">AI 估算，請確認後再加入</p>
                      <p className="mt-1 text-xs text-amber-900/90">
                        營養數值為模型推估，加入飲食紀錄前請自行核對。
                      </p>
                      <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={aiEstimateConfirmed}
                          onChange={(e) =>
                            setAiEstimateConfirmed(e.target.checked)
                          }
                        />
                        <span>我已確認營養資料可接受</span>
                      </label>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-600">份量（克）</span>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="w-32"
                        value={quantityG}
                        onChange={(e) =>
                          setQuantityG(Number(e.target.value) || 0)
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      disabled={
                        addBusy ||
                        quantityG <= 0 ||
                        (selectedHit.source === 'ai_estimate' &&
                          !aiEstimateConfirmed)
                      }
                      onClick={() => void onAddSearch()}
                    >
                      {addBusy ? '加入中…' : '加入紀錄'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void onPhotoFile(e.target.files?.[0] ?? null)}
              />
              {photoBusy ? (
                <p className="text-sm text-slate-600">上傳並排入分析…</p>
              ) : null}
              {photoHint ? (
                <p className="text-xs text-amber-700">{photoHint}</p>
              ) : null}
              {activeJobId && jobStatus && jobStatus !== 'ready' ? (
                <p className="text-sm text-slate-600">
                  AI 分析中（{jobStatus}）…
                </p>
              ) : null}
              {photoError ? (
                <p className="text-sm text-red-600">{photoError}</p>
              ) : null}

              {photoPreview?.length ? (
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-800">
                    辨識結果（確認後寫入 {MEAL_LABEL[mealTab]}）
                  </p>
                  <ul className="space-y-1 text-sm">
                    {photoPreview.map((it, idx) => (
                      <li
                        key={`${it.name}-${idx}`}
                        className="flex justify-between gap-2 text-slate-700"
                      >
                        <span>
                          {it.name}{' '}
                          <span className="text-slate-500">
                            {Math.round(it.quantity_g)}g
                          </span>
                        </span>
                        <span>{Math.round(it.calories)} kcal</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
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

      <div>
        <h2 className="text-lg font-semibold text-slate-900">今日紀錄</h2>
        <div className="mt-4 space-y-6">
          {MEAL_ORDER.map((m) => {
            const logs = grouped.get(m) ?? [];
            return (
              <section key={m}>
                <h3 className="text-sm font-medium text-slate-700">
                  {MEAL_LABEL[m]}
                </h3>
                {logs.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">尚無紀錄</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {logs.map((log) => (
                      <li key={log.id}>
                        <Card className="border-slate-200">
                          <CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">
                                  {log.method === 'photo'
                                    ? '拍照'
                                    : log.method === 'search'
                                      ? '搜尋'
                                      : '手動'}
                                </Badge>
                                <span className="text-sm text-slate-500">
                                  {sumLogCalories(log.food_log_items)} kcal
                                </span>
                              </div>
                              <ul className="text-sm text-slate-800">
                                {(log.food_log_items ?? []).map((it) => (
                                  <li key={it.id}>
                                    {it.name}{' '}
                                    <span className="text-slate-500">
                                      {Number(it.quantity_g)}g ·{' '}
                                      {Math.round(Number(it.calories))} kcal
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 shrink-0 px-3 text-xs"
                              onClick={() => void onDeleteLog(log.id)}
                            >
                              刪除
                            </Button>
                          </CardContent>
                        </Card>
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
