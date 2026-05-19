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
import {
  FiActivity,
  FiCamera,
  FiCoffee,
  FiTrash2,
  FiUser,
} from "react-icons/fi";

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
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
};

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

type MealType = (typeof MEAL_ORDER)[number];

function roundMacroG(n: number): number {
  return Math.round(Number(n));
}

function logItemToManualResult(it: LogItemSnapshot): ManualFoodAnalysisResult {
  const q = Math.round(Number(it.quantity_g));
  return {
    name: it.name,
    quantity_g: q > 0 ? q : 1,
    quantity_description: "",
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
  if (it.fiber_g === null) return "—";
  return `${roundMacroG(Number(it.fiber_g))}g`;
}

function formatSodium(it: LogItemSnapshot): string {
  if (it.sodium_mg === null) return "—";
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
            className="mt-0.5 block text-left text-[11px] font-normal leading-snug text-muted-foreground transition-opacity hover:opacity-80">
            {open ? "收合 ‹" : "更多 ›"}
          </button>
          <div
            className="overflow-hidden transition-[max-height] duration-[150ms] ease-[ease]"
            style={{ maxHeight: open ? 96 : 0 }}>
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

export type LogSectionTab = "food" | "activity" | "body";

interface LogClientProps {
  date: string;
  dailyCalTarget: number | null;
  initialLogs: FoodLogSnapshot[];
  /** URL `meal_type`，無預填時用來選預設餐次 Tab */
  initialMealTab?: MealType | null;
  /** URL `tab`：飲食 / 運動 / 其他（`body`） */
  sectionTab?: LogSectionTab;
  initialActivities?: ActivityLogRow[];
  initialVital: LogVitalSnapshot;
  isLogToday: boolean;
}

function LogSectionTabs({
  date,
  active,
}: {
  date: string;
  active: LogSectionTab;
}) {
  const router = useRouter();

  function go(tab: LogSectionTab) {
    const p = new URLSearchParams();
    p.set("date", date);
    p.set("tab", tab);
    router.replace(`/log?${p.toString()}`);
  }

  const tabBtn = (tab: LogSectionTab, label: string, Icon: typeof FiCoffee) => (
    <button
      key={tab}
      type="button"
      role="tab"
      aria-selected={active === tab}
      onClick={() => go(tab)}
      className={cn(
        "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors",
        active === tab
          ? "bg-primary text-white"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex w-full gap-2" role="tablist" aria-label="紀錄類別">
      {tabBtn("food", "飲食", FiCoffee)}
      {tabBtn("activity", "運動", FiActivity)}
      {tabBtn("body", "其他", FiUser)}
    </div>
  );
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
}: LogClientProps) {
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

  const [dayLogs, setDayLogs] = useState(initialLogs);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    setDayLogs(initialLogs);
  }, [initialLogs]);

  const todayTotal = useMemo(() => totalDayKcalFromLogs(dayLogs), [dayLogs]);

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

  const grouped = useMemo(() => {
    const map = new Map<string, FoodLogSnapshot[]>();
    for (const k of MEAL_ORDER) map.set(k, []);
    for (const log of dayLogs) {
      const key = log.meal_type in MEAL_LABEL ? log.meal_type : "snack";
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
        .from("food_log_items")
        .update({
          name: edited.name.trim() || "未命名",
          quantity_g: edited.quantity_g,
          calories: edited.calories,
          protein_g: edited.protein_g,
          carb_g: edited.carb_g,
          fat_g: edited.fat_g,
          fiber_g: edited.fiber_g,
          sodium_mg: edited.sodium_mg,
        })
        .eq("id", itemId);

      setEditSaving(false);
      if (error) {
        setActionError(error.message);
        return;
      }

      setDayLogs((prev) =>
        patchLogItemInLogs(prev, itemId, {
          name: edited.name.trim() || "未命名",
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
        <div className="rounded-xl bg-card px-4 py-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">今日已攝取</p>
              <p className="tabular-nums text-heading-page leading-tight text-foreground">
                {Math.round(todayTotal)}
                <span className="text-[13px] font-normal text-muted-foreground">
                  {" "}
                  kcal
                </span>
              </p>
            </div>
            <div className="text-right">
              {dailyCalTarget != null ? (
                <p className="text-[11px] text-muted-foreground">
                  目標 {Math.round(Number(dailyCalTarget))} kcal
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  尚未設定熱量目標
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-muted-foreground">{date}</p>
            </div>
          </div>
        </div>
      ) : null}

      {sectionTab === "food" ? (
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
                  capture="environment"
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

      {sectionTab === "food" ? (
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
                          <div className="flex overflow-hidden rounded-xl bg-card">
                            <div className="min-w-0 flex-1 divide-y-hairline divide-border">
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
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setExpandedItemId((prev) =>
                                          prev === it.id ? null : it.id,
                                        );
                                      }
                                    }}>
                                    <span
                                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                                      aria-hidden
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[13px] font-medium text-foreground">
                                        {it.name}{" "}
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
                                    }}>
                                    {expandedItemId === it.id ? (
                                      <div className="rounded-b-xl border-t border-border bg-card p-4">
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
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="shrink-0 self-stretch px-3 py-3 text-muted-foreground transition-colors hover:text-destructive"
                              aria-label="刪除此筆紀錄"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onDeleteLog(log.id);
                              }}>
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
