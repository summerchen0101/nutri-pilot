'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  AddFoodFromSearchPanel,
  FoodSourceDotInline,
} from '@/app/(main)/log/add-food-from-search';
import {
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

function sumLogNutrients(items: LogItemSnapshot[] | null): {
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
} {
  if (!items?.length) {
    return { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 };
  }
  return items.reduce(
    (acc, it) => ({
      calories: acc.calories + Number(it.calories),
      protein_g: acc.protein_g + Number(it.protein_g),
      carb_g: acc.carb_g + Number(it.carb_g),
      fat_g: acc.fat_g + Number(it.fat_g),
    }),
    { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
  );
}

function roundMacroG(n: number): number {
  return Math.round(Number(n));
}

function MacrosOneLine(props: {
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
    <span className="inline-flex flex-wrap items-baseline gap-x-1 text-[11px] font-normal leading-snug">
      <span className="tabular-nums font-medium text-foreground">{kcal}</span>
      <span className="font-normal text-muted-foreground">kcal</span>
      <span className="text-muted-foreground">·</span>
      <span className="tabular-nums text-[#378ADD]">碳水{c}g</span>
      <span className="text-muted-foreground">·</span>
      <span className="tabular-nums text-[#1B7A5A]">蛋白{p}g</span>
      <span className="text-muted-foreground">·</span>
      <span className="tabular-nums text-[#EF9F27]">脂肪{f}g</span>
    </span>
  );
}

function formatPrimaryMacroLine(it: LogItemSnapshot): ReactNode {
  return (
    <MacrosOneLine
      calories={it.calories}
      carb_g={it.carb_g}
      protein_g={it.protein_g}
      fat_g={it.fat_g}
    />
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
      <div>{formatPrimaryMacroLine(item)}</div>
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

function formatLogTotalsLine(totals: ReturnType<typeof sumLogNutrients>) {
  return (
    <MacrosOneLine
      calories={totals.calories}
      carb_g={totals.carb_g}
      protein_g={totals.protein_g}
      fat_g={totals.fat_g}
    />
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

      <Card>
        <CardHeader className="pb-2">
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
            <div className="space-y-3">
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

              <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border-[0.5px] border-border bg-card p-2">
                {searchHits.map((h, i) => (
                  <li key={`${h.id}-${i}`}>
                    <button
                      type="button"
                      className={cn(
                        'w-full rounded-[10px] border-[0.5px] py-2.5 pl-3 pr-2 text-left transition-colors duration-150',
                        selectedHit?.id === h.id
                          ? 'border-[#1B7A5A] bg-[#E0F5EE]'
                          : 'border-transparent hover:bg-secondary',
                      )}
                      onClick={() => setSelectedHit(h)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-1.5">
                          <FoodSourceDotInline row={h} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-normal leading-snug text-foreground">
                            {h.name}
                          </p>
                          {h.brand ? (
                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                              {h.brand}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

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
            <div className="space-y-3">
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
                        <Card>
                          <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">
                                  {log.method === 'photo'
                                    ? '拍照'
                                    : log.method === 'search'
                                      ? '搜尋'
                                      : '手動'}
                                </Badge>
                                <span className="inline-flex flex-wrap items-center gap-x-1">
                                  {formatLogTotalsLine(
                                    sumLogNutrients(log.food_log_items),
                                  )}
                                </span>
                              </div>
                              <ul className="space-y-2 text-[13px] text-foreground">
                                {(log.food_log_items ?? []).map((it) => (
                                  <li key={it.id}>
                                    <div>
                                      <span>{it.name}</span>{' '}
                                      <span className="text-muted-foreground">
                                        {Math.round(Number(it.quantity_g))}g
                                      </span>
                                    </div>
                                    <LogItemNutrition item={it} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 shrink-0 px-3 text-[13px]"
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
