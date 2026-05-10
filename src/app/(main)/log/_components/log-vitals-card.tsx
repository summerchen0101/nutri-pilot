"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type CSSProperties } from "react";

import { DashboardWaterGrid } from "@/app/(main)/dashboard/dashboard-water-grid";
import {
  logWeightForDateAction,
  setSleepHoursForDateAction,
} from "@/app/(main)/log/vitals-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/** 與儀表板首頁預設飲水目標一致（待 Schema 個人化後替換） */
const LOG_PAGE_WATER_TARGET_ML = 2000;

/** 睡眠滑桿下方數字標籤（小時） */
const SLEEP_SCALE_LABEL_HOURS = [0, 6, 12, 18, 24] as const;
/** 0–24 每小時一個細刻度 */
const SLEEP_HOUR_TICK_COUNT = 25;

/** 體重加減按鈕步進（無紀錄時首次按「加」自此 kg 開始） */
const BODY_INPUT_STEP = 0.5;
const WEIGHT_KG_MIN = 15;
const WEIGHT_KG_MAX = 400;
const WEIGHT_EMPTY_SEED_KG = 60;

/** 無外框圖示按鈕：與設定頁筆形圖示接近的線寬與尺寸 */
const BODY_STEPPER_ICON_CLASS = "h-[18px] w-[18px] shrink-0";
const BODY_STEPPER_BTN_CLASS =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-foreground transition-colors hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed";

function roundToHalfStep(n: number): number {
  return Math.round(n * 2) / 2;
}

function clampHalfStep(n: number, min: number, max: number): number {
  const stepped = roundToHalfStep(n);
  return Math.min(max, Math.max(min, stepped));
}

function formatBodyDraft(n: number): string {
  const r = roundToHalfStep(n);
  return r % 1 === 0 ? String(r) : r.toFixed(1);
}

function parseWeightKgDraft(
  draft: string,
  fallbackKg: number | null,
): number | null {
  const n = Number(draft);
  if (Number.isFinite(n)) return n;
  if (fallbackKg != null) return fallbackKg;
  return null;
}

function formatSleepHoursLabel(h: number): string {
  if (!Number.isFinite(h) || h < 0) return "0 小時";
  const r = Math.round(h * 10) / 10;
  return `${r % 1 === 0 ? String(r) : r.toFixed(1)} 小時`;
}

export interface LogVitalSnapshot {
  weightKg: number | null;
  waterMl: number;
  sleepHours: number | null;
}

export interface LogVitalsCardProps {
  dateIso: string;
  isToday: boolean;
  initialVital: LogVitalSnapshot;
}

const RANGE_STEP_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export function LogVitalsCard({
  dateIso,
  isToday,
  initialVital,
}: LogVitalsCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const [weightDraft, setWeightDraft] = useState(
    initialVital.weightKg != null ? String(initialVital.weightKg) : "",
  );
  const [sleepHoursLocal, setSleepHoursLocal] = useState(
    initialVital.sleepHours != null ? Number(initialVital.sleepHours) : 0,
  );

  useEffect(() => {
    setWeightDraft(
      initialVital.weightKg != null ? String(initialVital.weightKg) : "",
    );
    setSleepHoursLocal(
      initialVital.sleepHours != null ? Number(initialVital.sleepHours) : 0,
    );
  }, [initialVital.weightKg, initialVital.sleepHours]);

  function runAction(fn: () => Promise<{ error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function commitSleepHours(hours: number) {
    runAction(() => setSleepHoursForDateAction(dateIso, hours));
  }

  const weightKgForAdjust = parseWeightKgDraft(
    weightDraft,
    initialVital.weightKg,
  );

  return (
    <div className="space-y-2.5">
      {actionError ? (
        <p className="text-[13px] text-destructive">{actionError}</p>
      ) : null}

      <div className="rounded-xl bg-card px-4 py-3">
        <h2 className="mb-1 text-[15px] font-medium text-foreground">體重</h2>
        <p className="mb-3 text-caption text-muted-foreground">
          需點「更新體重」儲存（身高請至「我的」頁面調整）
        </p>

        <div>
          {!isToday ? (
            <p className="mb-2 text-[11px] text-muted-foreground">
              僅寫入此日紀錄，不更新個人檔案目前體重
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={BODY_STEPPER_BTN_CLASS}
                aria-label={`體重減 ${BODY_INPUT_STEP} kg`}
                disabled={pending || weightKgForAdjust === null}
                onClick={() => {
                  const base = parseWeightKgDraft(
                    weightDraft,
                    initialVital.weightKg,
                  );
                  if (base === null) return;
                  setWeightDraft(
                    formatBodyDraft(
                      clampHalfStep(
                        base - BODY_INPUT_STEP,
                        WEIGHT_KG_MIN,
                        WEIGHT_KG_MAX,
                      ),
                    ),
                  );
                }}>
                <Minus
                  className={BODY_STEPPER_ICON_CLASS}
                  strokeWidth={1.8}
                  aria-hidden
                />
              </button>
              <p
                aria-live="polite"
                className="flex min-h-10 min-w-[5.25rem] max-w-[8.25rem] items-center justify-center rounded-[10px] border-hairline border-transparent bg-muted/50 px-2 tabular-nums text-heading-page text-foreground">
                {weightKgForAdjust != null ? (
                  <>
                    {formatBodyDraft(weightKgForAdjust)}
                    <span className="ml-0.5 text-body font-normal text-muted-foreground">
                      kg
                    </span>
                  </>
                ) : (
                  <span className="text-body font-normal text-muted-foreground">
                    —
                  </span>
                )}
              </p>
              <button
                type="button"
                className={BODY_STEPPER_BTN_CLASS}
                aria-label={`體重加 ${BODY_INPUT_STEP} kg`}
                disabled={pending}
                onClick={() => {
                  const base = parseWeightKgDraft(
                    weightDraft,
                    initialVital.weightKg,
                  );
                  const start =
                    base ??
                    clampHalfStep(
                      WEIGHT_EMPTY_SEED_KG,
                      WEIGHT_KG_MIN,
                      WEIGHT_KG_MAX,
                    );
                  if (base === null) {
                    setWeightDraft(
                      formatBodyDraft(
                        clampHalfStep(start, WEIGHT_KG_MIN, WEIGHT_KG_MAX),
                      ),
                    );
                    return;
                  }
                  setWeightDraft(
                    formatBodyDraft(
                      clampHalfStep(
                        base + BODY_INPUT_STEP,
                        WEIGHT_KG_MIN,
                        WEIGHT_KG_MAX,
                      ),
                    ),
                  );
                }}>
                <Plus
                  className={BODY_STEPPER_ICON_CLASS}
                  strokeWidth={1.8}
                  aria-hidden
                />
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || weightKgForAdjust === null}
              onClick={() => {
                if (weightKgForAdjust === null) return;
                runAction(() =>
                  logWeightForDateAction(dateIso, weightKgForAdjust),
                );
              }}>
              更新體重
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card px-4 py-3">
        <h2 className="mb-3 text-[15px] font-medium text-foreground">
          水分與睡眠
        </h2>

        <div className="space-y-4">
          <DashboardWaterGrid
            initialWaterMl={initialVital.waterMl}
            embedded
            waterTargetMl={LOG_PAGE_WATER_TARGET_ML}
            showQuickAdds
            forDateIso={dateIso}
          />

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                className="text-[11px] text-muted-foreground"
                htmlFor="log-sleep-hours-range">
                睡眠時數
              </label>
              <p className="text-[13px] tabular-nums text-foreground">
                {formatSleepHoursLabel(sleepHoursLocal)}
              </p>
            </div>
            <input
              id="log-sleep-hours-range"
              type="range"
              min={0}
              max={24}
              step={0.5}
              value={sleepHoursLocal}
              disabled={pending}
              className="log-sleep-range relative z-10 mt-2 h-2 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              style={
                {
                  "--log-sleep-fill-pct": `${Math.min(100, Math.max(0, (sleepHoursLocal / 24) * 100))}%`,
                } as CSSProperties
              }
              aria-valuemin={0}
              aria-valuemax={24}
              aria-valuenow={sleepHoursLocal}
              aria-valuetext={formatSleepHoursLabel(sleepHoursLocal)}
              onChange={(e) => setSleepHoursLocal(Number(e.target.value))}
              onPointerUp={(e) => {
                if (pending) return;
                commitSleepHours(Number(e.currentTarget.value));
              }}
              onKeyUp={(e) => {
                if (!RANGE_STEP_KEYS.has(e.key)) return;
                const el = e.currentTarget;
                window.requestAnimationFrame(() => {
                  if (pending) return;
                  commitSleepHours(Number(el.value));
                });
              }}
            />
            <div className="relative mt-1 w-full select-none" aria-hidden>
              <div className="relative h-3 w-full">
                {Array.from({ length: SLEEP_HOUR_TICK_COUNT }, (_, hour) => {
                  const edgeStyle =
                    hour === 0
                      ? { left: 0 }
                      : hour === 24
                        ? {
                            left: "100%" as const,
                            transform: "translateX(-100%)",
                          }
                        : {
                            left: `${(hour / 24) * 100}%`,
                            transform: "translateX(-50%)",
                          };
                  return (
                    <span
                      key={hour}
                      className={cn(
                        "absolute bottom-0 w-px bg-border",
                        hour % 6 === 0 ? "h-2.5" : "h-1",
                      )}
                      style={edgeStyle}
                    />
                  );
                })}
              </div>
              <div className="relative mt-0.5 h-4 w-full">
                {SLEEP_SCALE_LABEL_HOURS.map((h) => (
                  <span
                    key={h}
                    className="absolute top-0 text-[10px] tabular-nums text-muted-foreground"
                    style={
                      h === 0
                        ? { left: 0, transform: "none" }
                        : h === 24
                          ? { left: "100%", transform: "translateX(-100%)" }
                          : {
                              left: `${(h / 24) * 100}%`,
                              transform: "translateX(-50%)",
                            }
                    }>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
