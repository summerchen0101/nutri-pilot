"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type CSSProperties } from "react";

import { DashboardWaterGrid } from "@/app/(main)/dashboard/dashboard-water-grid";
import {
  logWeightForDateAction,
  saveHeightCmFromLogAction,
  setSleepHoursForDateAction,
} from "@/app/(main)/log/vitals-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

/** 與儀表板首頁預設飲水目標一致（待 Schema 個人化後替換） */
const LOG_PAGE_WATER_TARGET_ML = 2000;

/** 睡眠滑桿下方數字標籤（小時） */
const SLEEP_SCALE_LABEL_HOURS = [0, 6, 12, 18, 24] as const;
/** 0–24 每小時一個細刻度 */
const SLEEP_HOUR_TICK_COUNT = 25;

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
  initialHeightCm: number;
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
  initialHeightCm,
  initialVital,
}: LogVitalsCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const [heightDraft, setHeightDraft] = useState(String(initialHeightCm));
  const [weightDraft, setWeightDraft] = useState(
    initialVital.weightKg != null ? String(initialVital.weightKg) : "",
  );
  const [sleepHoursLocal, setSleepHoursLocal] = useState(
    initialVital.sleepHours != null ? Number(initialVital.sleepHours) : 0,
  );

  useEffect(() => {
    setHeightDraft(String(initialHeightCm));
  }, [initialHeightCm]);

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

  return (
    <div className="space-y-2.5">
      {actionError ? (
        <p className="text-[13px] text-destructive">{actionError}</p>
      ) : null}

      <div className="rounded-xl bg-card px-4 py-3">
        <h2 className="mb-3 text-[15px] font-medium text-foreground">身體</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-muted-foreground">
              身高（與設定頁共用，單位 cm）
            </label>
            <div className="mt-1 flex flex-wrap items-end gap-2">
              <Input
                type="number"
                min={80}
                max={250}
                step={0.1}
                inputMode="decimal"
                className="max-w-[132px] tabular-nums"
                value={heightDraft}
                disabled={pending}
                onChange={(e) => setHeightDraft(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  runAction(() =>
                    saveHeightCmFromLogAction(Number(heightDraft)),
                  )
                }>
                更新身高
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-muted-foreground">
              體重（kg）
            </label>
            {!isToday ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                僅寫入此日紀錄，不更新個人檔案目前體重
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-end gap-2">
              <Input
                type="number"
                min={15}
                max={400}
                step={0.1}
                inputMode="decimal"
                className="max-w-[132px] tabular-nums"
                value={weightDraft}
                disabled={pending}
                onChange={(e) => setWeightDraft(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  runAction(() =>
                    logWeightForDateAction(dateIso, Number(weightDraft)),
                  )
                }>
                更新體重
              </Button>
            </div>
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
