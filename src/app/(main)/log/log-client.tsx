"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { UtensilsCrossed } from "lucide-react";
import { FiCamera } from "react-icons/fi";

import { FoodLogDayList } from "@/app/(main)/log/_components/food-log-day-list";
import { LogDayKcalSummary } from "@/app/(main)/log/_components/log-day-kcal-summary";
import {
  LogVitalsCard,
  type LogVitalSnapshot,
} from "@/app/(main)/log/_components/log-vitals-card";
import { AddFoodManualAiPanel } from "@/app/(main)/log/add-food-manual-ai";
import {
  confirmPhotoItemsAction,
  deleteFoodLogAction,
  listFrequentFoodLogItemsAction,
  type FrequentFoodItemSnapshot,
} from "@/app/(main)/log/actions";
import {
  ActivityLogSection,
  type ActivityLogRow,
} from "@/app/(main)/log/activity-log-section";
import {
  MEAL_LABEL,
  MEAL_ORDER,
  logItemToManualResult,
  totalDayKcalFromLogs,
  type FoodLogSnapshot,
  type LogItemSnapshot,
} from "@/app/(main)/log/log-food-snapshot";
import {
  LogSectionTabs,
  type LogSectionTab,
} from "@/app/(main)/log/log-section-tabs";
import type { LogDateMode } from "@/lib/log/log-date-policy";
import { getLogFoodListTitle } from "@/lib/log/log-date-label";
import { NutritionResultCard } from "@/components/food/NutritionResultCard";
import { Button } from "@/components/ui/button";
import { BottomSheetShell } from "@/components/ui/bottom-sheet-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  usePendingAnalysisJobsStore,
  type LogMealTab,
} from "@/lib/ai/pending-analysis-jobs-store";
import { createSignedStoragePreviewUrl } from "@/lib/ai/signed-storage-preview-url";
import { isTerminalJobStatus } from "@/lib/ai/watch-analysis-job";
import { compressImageForUpload } from "@/lib/food/compress-image-for-upload";
import { invokeAiPhotoRequestFromBrowser } from "@/lib/food/invoke-photo-request";
import type { ManualFoodAnalysisResult } from "@/lib/food/manual-food-analysis-result";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export type { FoodLogSnapshot, LogItemSnapshot, LogSectionTab };

type MealType = (typeof MEAL_ORDER)[number];

function ItemMacrosMutedLine(props: {
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
}) {
  const kcal = Math.round(Number(props.calories));
  const c = Math.round(Number(props.carb_g));
  const p = Math.round(Number(props.protein_g));
  const f = Math.round(Number(props.fat_g));
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

interface LogClientProps {
  date: string;
  dailyCalTarget: number | null;
  initialLogs: FoodLogSnapshot[];
  initialMealTab?: MealType | null;
  sectionTab?: LogSectionTab;
  initialActivities?: ActivityLogRow[];
  initialVital: LogVitalSnapshot;
  isLogToday: boolean;
  logDateMode: LogDateMode;
}

export function LogClient({
  date,
  dailyCalTarget,
  initialLogs,
  initialMealTab = null,
  sectionTab = "food",
  initialActivities = [],
  initialVital,
  isLogToday,
  logDateMode,
}: LogClientProps) {
  const canEditFood = logDateMode === 'today' || logDateMode === 'yesterday_editable';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mealTab, setMealTab] = useState<MealType>(
    () => initialMealTab ?? "breakfast",
  );
  const [inputMode, setInputMode] = useState<"manual" | "photo">("manual");

  const [frequentOpen, setFrequentOpen] = useState(false);
  const [frequentLoading, setFrequentLoading] = useState(false);
  const [frequentErr, setFrequentErr] = useState<string | null>(null);
  const [frequentRows, setFrequentRows] = useState<
    Array<{ snapshot: FrequentFoodItemSnapshot; useCount: number }>
  >([]);
  const [applyHistoryPrefill, setApplyHistoryPrefill] = useState<{
    version: number;
    result: ManualFoodAnalysisResult;
  } | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoLocalError, setPhotoLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photoPending = usePendingAnalysisJobsStore((s) => s.photo);
  const startPhotoJob = usePendingAnalysisJobsStore((s) => s.startPhotoJob);
  const patchPhotoFromRow = usePendingAnalysisJobsStore((s) => s.patchPhotoFromRow);
  const setPhotoStagingResult = usePendingAnalysisJobsStore(
    (s) => s.setPhotoStagingResult,
  );
  const clearPhoto = usePendingAnalysisJobsStore((s) => s.clearPhoto);

  const photoPreviewUrl = photoPending?.previewUrl ?? null;
  const photoResult = photoPending?.result ?? null;
  const photoHint = photoPending?.hint ?? null;
  const photoError = photoPending?.error ?? photoLocalError;
  const jobStatus = photoPending?.status ?? null;
  const activeJobId = photoPending?.jobId || null;

  const todayTotal = useMemo(
    () => totalDayKcalFromLogs(initialLogs),
    [initialLogs],
  );

  useEffect(() => {
    if (!photoPending?.jobId && !photoPending?.result) return;
    setInputMode("photo");
  }, [photoPending?.jobId, photoPending?.result]);

  useEffect(() => {
    const tab = photoPending?.context.mealTab;
    if (tab) setMealTab(tab);
  }, [photoPending?.context.mealTab]);

  useEffect(() => {
    if (!photoPending?.storagePath || photoPending.previewUrl) return;
    let cancelled = false;
    void createSignedStoragePreviewUrl(
      "food-photos",
      photoPending.storagePath,
    ).then((url) => {
      if (cancelled || !url) return;
      usePendingAnalysisJobsStore.getState().setPhotoPreviewUrl(url, false);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPending?.storagePath, photoPending?.previewUrl]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    const m = searchParams.get("meal_type");
    if (m === "breakfast" || m === "lunch" || m === "dinner" || m === "snack") {
      setMealTab(m);
    }
  }, [searchParams]);

  useEffect(() => {
    if (initialMealTab) setMealTab(initialMealTab);
  }, [initialMealTab]);

  useEffect(() => {
    if (!frequentOpen) return;
    let cancelled = false;
    setFrequentLoading(true);
    setFrequentErr(null);
    void listFrequentFoodLogItemsAction().then((res) => {
      if (cancelled) return;
      setFrequentLoading(false);
      if (res.error) {
        setFrequentErr(res.error);
        return;
      }
      setFrequentRows(res.items ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [frequentOpen]);

  function pickFrequentItem(row: {
    snapshot: FrequentFoodItemSnapshot;
    useCount: number;
  }) {
    const snap: LogItemSnapshot = { ...row.snapshot };
    const manual = logItemToManualResult(snap);
    setFrequentOpen(false);
    if (inputMode === "manual") {
      setApplyHistoryPrefill((p) => ({
        version: (p?.version ?? 0) + 1,
        result: manual,
      }));
    } else {
      setPhotoLocalError(null);
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPhotoStagingResult({
        result: manual,
        hint: "已從常用項目帶入，可調整後確認",
        context: { date, mealTab: mealTab as LogMealTab },
      });
    }
  }

  async function onDeleteLog(logId: string) {
    const err = await deleteFoodLogAction(logId);
    if (err.error) {
      setActionError(err.error);
      return;
    }
    refresh();
  }

  function resetPhotoResultForReselect() {
    setPhotoLocalError(null);
    setPhotoBusy(false);
    clearPhoto();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onPhotoFile(file: File | null) {
    if (!file) return;
    setPhotoLocalError(null);
    clearPhoto();
    const objectUrl = URL.createObjectURL(file);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPhotoLocalError("未登入");
      return;
    }

    setPhotoBusy(true);
    let uploadFile: File;
    try {
      uploadFile = await compressImageForUpload(file);
    } catch (e) {
      setPhotoBusy(false);
      setPhotoLocalError(e instanceof Error ? e.message : "圖片處理失敗");
      return;
    }

    const ext =
      uploadFile.name.split(".").pop()?.toLowerCase() ??
      (uploadFile.type === "image/png"
        ? "png"
        : uploadFile.type === "image/webp"
          ? "webp"
          : "jpg");
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext)
      ? ext === "jpeg"
        ? "jpg"
        : ext
      : "jpg";

    const path = `${user.id}/${Date.now()}.${safeExt}`;
    const mime =
      uploadFile.type ||
      (safeExt === "png"
        ? "image/png"
        : safeExt === "webp"
          ? "image/webp"
          : "image/jpeg");

    const { error: upErr } = await supabase.storage
      .from("food-photos")
      .upload(path, uploadFile, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      setPhotoBusy(false);
      setPhotoLocalError(upErr.message);
      return;
    }

    const inv = await invokeAiPhotoRequestFromBrowser(path);
    setPhotoBusy(false);

    if (inv.error) {
      setPhotoLocalError(inv.error);
      return;
    }

    const jid = inv.jobId;
    if (!jid) {
      setPhotoLocalError("未回傳 jobId");
      return;
    }

    startPhotoJob({
      jobId: jid,
      storagePath: path,
      previewUrl: objectUrl,
      previewIsBlob: true,
      hint: inv.hint ?? null,
      context: { date, mealTab: mealTab as LogMealTab },
      initialStatus: "pending",
    });

    const { data: row } = await supabase
      .from("photo_analysis_jobs")
      .select("status,result_json,error_message")
      .eq("id", jid)
      .maybeSingle();

    if (row) patchPhotoFromRow(row);
  }

  async function onConfirmPhoto(edited: ManualFoodAnalysisResult) {
    setAddBusy(true);
    const confirmMeal = photoPending?.context.mealTab ?? mealTab;
    const confirmDate = photoPending?.context.date ?? date;
    const err = await confirmPhotoItemsAction({
      mealType: confirmMeal,
      date: confirmDate,
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
      setPhotoLocalError(err.error);
      return;
    }
    clearPhoto();
    setPhotoLocalError(null);
    refresh();
  }

  function handlePhotoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    void onPhotoFile(file);
  }

  const photoWaitingAnalysis =
    !!photoPreviewUrl &&
    !photoResult &&
    (photoBusy ||
      (!!activeJobId &&
        !!jobStatus &&
        !isTerminalJobStatus(jobStatus)));

  const mealPillPrimary =
    "min-h-9 h-9 shrink-0 rounded-full px-4 py-0 text-[13px] font-medium border-hairline border-transparent";
  const mealPillInactive =
    "min-h-9 h-9 shrink-0 rounded-full px-4 py-0 text-[13px] font-medium border-hairline border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div className="space-y-2.5">
      <LogSectionTabs date={date} active={sectionTab} />

      {sectionTab === "body" ? (
        <LogVitalsCard
          dateIso={date}
          isToday={isLogToday}
          initialVital={initialVital}
        />
      ) : null}

      {sectionTab === "food" ? (
        <LogDayKcalSummary
          consumedKcal={todayTotal}
          dailyCalTarget={dailyCalTarget}
          dateLine={date}
          showNoGoalHint
        />
      ) : null}

      {sectionTab === "food" && canEditFood ? (
        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardHeader className="pb-2">
            <SectionHeading
              icon={UtensilsCrossed}
              as="h3"
              className="leading-none tracking-tight">
              新增紀錄
            </SectionHeading>
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
                    variant={mealTab === m ? "default" : "ghost"}
                    className={
                      mealTab === m ? mealPillPrimary : mealPillInactive
                    }
                    onClick={() => setMealTab(m)}>
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
                  variant={inputMode === "manual" ? "default" : "ghost"}
                  className={
                    inputMode === "manual" ? mealPillPrimary : mealPillInactive
                  }
                  onClick={() => setInputMode("manual")}>
                  手動輸入
                </Button>
                <Button
                  type="button"
                  variant={inputMode === "photo" ? "default" : "ghost"}
                  className={
                    inputMode === "photo" ? mealPillPrimary : mealPillInactive
                  }
                  onClick={() => setInputMode("photo")}>
                  拍照辨識
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "min-h-9 h-9 shrink-0 rounded-full border-hairline px-4 py-0 text-[13px] font-medium",
                  )}
                  onClick={() => setFrequentOpen(true)}>
                  選擇常用
                </Button>
              </div>
            </div>

            {inputMode === "manual" ? (
              <div key="input-mode-manual" className="space-y-3">
                {actionError ? (
                  <p className="text-[13px] text-destructive">{actionError}</p>
                ) : null}
                <AddFoodManualAiPanel
                  mealType={mealTab}
                  mealLabelZh={MEAL_LABEL[mealTab]}
                  date={date}
                  applyHistoryPrefill={applyHistoryPrefill}
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
                  className="hidden"
                  onChange={handlePhotoFileChange}
                />

                {!photoPreviewUrl && !photoResult ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-hairline border-dashed border-white/25 bg-primary py-8 text-white transition-colors active:bg-primary-dark">
                    <FiCamera
                      className="h-8 w-8 shrink-0 text-white"
                      aria-hidden
                    />
                    <span className="text-[13px] font-medium text-white">
                      拍照或選擇相片
                    </span>
                    <span className="text-[11px] text-white/70">
                      支援 JPG、PNG
                    </span>
                  </button>
                ) : photoPreviewUrl && !photoResult ? (
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
                      className="absolute right-2 top-2 rounded-full bg-[#1E212B]/70 px-3 py-1 text-[11px] text-white transition-opacity hover:opacity-90">
                      重新選擇
                    </button>
                  </div>
                ) : null}

                {photoBusy ? (
                  <p className="text-[13px] text-muted-foreground">
                    上傳並排入分析…
                  </p>
                ) : null}
                {photoHint ? (
                  <p className="text-[11px] text-amber-600">{photoHint}</p>
                ) : null}

                {photoWaitingAnalysis ? (
                  <div className="space-y-3 rounded-xl bg-card p-4">
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
                ) : null}

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
                    onReselect={resetPhotoResultForReselect}
                  />
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {sectionTab === "activity" ? (
        <ActivityLogSection date={date} rows={initialActivities} />
      ) : null}

      {sectionTab === 'food' ? (
        <FoodLogDayList
          logs={initialLogs}
          listTitle={getLogFoodListTitle()}
          onDeleteLog={onDeleteLog}
          onItemSaved={refresh}
          onActionError={setActionError}
        />
      ) : null}

      {sectionTab === "food" ? (
        <BottomSheetShell
          open={frequentOpen}
          title="選擇常用項目"
          onClose={() => setFrequentOpen(false)}>
          <div className="max-h-[min(50vh,420px)] space-y-2 overflow-y-auto pb-2">
            {frequentLoading ? (
              <p className="text-[13px] text-muted-foreground">載入中…</p>
            ) : frequentErr ? (
              <p className="text-[13px] text-destructive">{frequentErr}</p>
            ) : frequentRows.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                尚無可選的歷史項目
              </p>
            ) : (
              frequentRows.map((row) => (
                <button
                  key={row.snapshot.id}
                  type="button"
                  className="w-full rounded-xl bg-card px-3 py-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => pickFrequentItem(row)}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-[13px] font-medium text-foreground">
                      {row.snapshot.name}
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        {Math.round(Number(row.snapshot.quantity_g))}g
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {row.useCount} 次
                    </span>
                  </div>
                  <div className="mt-1">
                    <ItemMacrosMutedLine
                      calories={row.snapshot.calories}
                      carb_g={row.snapshot.carb_g}
                      protein_g={row.snapshot.protein_g}
                      fat_g={row.snapshot.fat_g}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </BottomSheetShell>
      ) : null}
    </div>
  );
}
