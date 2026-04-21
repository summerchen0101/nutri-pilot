"use client";

import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import { setWaterMlForTodayAction } from "@/app/(main)/dashboard/actions";
import { cn } from "@/lib/utils/cn";

const CUP_ML = 250;
const GRID_CELLS = 12;
const VISUAL_CAP_ML = CUP_ML * GRID_CELLS;

/** 飲水進度填色（與主色區隔，沿用設計系統第三色） */
const WATER_FILL_CLASS = "bg-[#378ADD] border-[#378ADD]/40";
const WATER_PARTIAL_CLASS = "bg-[#378ADD]";
/** 超過飲水目標後的格子／片段（第三色淺藍，與 AI 卡邊框同一系） */
const WATER_OVER_GOAL_FILL_CLASS = "bg-[#B5D4F4] border-[#378ADD]/35";
const WATER_OVER_GOAL_PARTIAL_CLASS = "bg-[#B5D4F4]";

type Props = {
  initialWaterMl: number;
  /** 嵌入卡片：寬度跟隨容器 */
  embedded?: boolean;
  /** 顯示標題列與右側「現量／目標 · 百分比」（僅 embedded 時使用） */
  waterTargetMl?: number;
  /** 底部 +250 ml／+500 ml */
  showQuickAdds?: boolean;
};

function formatMl(n: number): string {
  return n.toLocaleString("zh-Hant");
}

export function DashboardWaterGrid({
  initialWaterMl,
  embedded = false,
  waterTargetMl,
  showQuickAdds = false,
}: Props) {
  const router = useRouter();
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setWaterMl(initialWaterMl);
  }, [initialWaterMl]);

  const filledFull = Math.min(GRID_CELLS, Math.floor(waterMl / CUP_ML));
  const remainder = waterMl - filledFull * CUP_ML;
  const partialRatio =
    remainder > 0 && filledFull < GRID_CELLS ? remainder / CUP_ML : 0;

  function applyTarget(targetMl: number) {
    startTransition(async () => {
      const res = await setWaterMlForTodayAction(targetMl);
      if (res.error) return;
      setWaterMl(targetMl);
      router.refresh();
    });
  }

  function onCellClick(index: number) {
    if (pending) return;
    const target = (index + 1) * CUP_ML;
    applyTarget(target);
  }

  const target = waterTargetMl != null && waterTargetMl > 0 ? waterTargetMl : 0;
  const pct =
    target > 0 ? Math.min(100, Math.round((waterMl / target) * 100)) : 0;
  const showHeader = Boolean(embedded && target > 0);
  const useGoalSplit = target > 0;
  const goalMl = target;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        embedded ? "w-full" : "w-[84px] shrink-0",
      )}>
      {showHeader ? (
        <div className="mb-0.5 flex items-start justify-between gap-2">
          <p className="text-[15px] font-medium text-foreground">今日飲水</p>
          <p className="shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
            {formatMl(waterMl)} / {formatMl(target)} ml · {pct}%
          </p>
        </div>
      ) : null}
      {embedded ? null : (
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] font-medium text-muted-foreground">喝水</p>
          <p className="tabular-nums text-[10px] text-muted-foreground">
            {waterMl}
            <span className="text-[9px]"> ml</span>
          </p>
        </div>
      )}
      <div
        className={cn("grid grid-cols-12 gap-1")}
        role="group"
        aria-label="今日喝水量，點格子設定杯數">
        {Array.from({ length: GRID_CELLS }, (_, i) => {
          const isFull = i < filledFull;
          const isPartial = i === filledFull && partialRatio > 0;
          const cellEndMl = (i + 1) * CUP_ML;
          const fullOverGoal = useGoalSplit && isFull && cellEndMl > goalMl;
          const fullClass =
            useGoalSplit && isFull
              ? fullOverGoal
                ? WATER_OVER_GOAL_FILL_CLASS
                : WATER_FILL_CLASS
              : isFull
                ? WATER_FILL_CLASS
                : null;

          const cellStartMl = filledFull * CUP_ML;
          let partialBorder =
            "relative overflow-hidden border-[#378ADD]/30 bg-muted/60";
          let partialInner: ReactNode = null;
          if (isPartial) {
            if (!useGoalSplit) {
              partialInner = (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0",
                    WATER_PARTIAL_CLASS,
                  )}
                  style={{ width: `${partialRatio * 100}%` }}
                  aria-hidden
                />
              );
            } else if (waterMl <= goalMl) {
              partialInner = (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0",
                    WATER_PARTIAL_CLASS,
                  )}
                  style={{ width: `${partialRatio * 100}%` }}
                  aria-hidden
                />
              );
            } else if (cellStartMl >= goalMl) {
              partialBorder =
                "relative overflow-hidden border-[#378ADD]/25 bg-muted/60";
              partialInner = (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0",
                    WATER_OVER_GOAL_PARTIAL_CLASS,
                  )}
                  style={{ width: `${partialRatio * 100}%` }}
                  aria-hidden
                />
              );
            } else {
              const blueWidthPct = ((goalMl - cellStartMl) / CUP_ML) * 100;
              const lightWidthPct = ((waterMl - goalMl) / CUP_ML) * 100;
              partialBorder =
                "relative overflow-hidden border-[#378ADD]/25 bg-muted/60";
              partialInner = (
                <>
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0",
                      WATER_PARTIAL_CLASS,
                    )}
                    style={{ width: `${blueWidthPct}%` }}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "absolute inset-y-0",
                      WATER_OVER_GOAL_PARTIAL_CLASS,
                    )}
                    style={{
                      left: `${blueWidthPct}%`,
                      width: `${lightWidthPct}%`,
                    }}
                    aria-hidden
                  />
                </>
              );
            }
          }

          return (
            <button
              key={i}
              type="button"
              disabled={pending}
              onClick={() => onCellClick(i)}
              className={cn(
                "aspect-square rounded-md border-[0.5px] border-border transition-colors",
                fullClass ?? "bg-muted/60",
                isPartial ? partialBorder : null,
              )}
              aria-label={`設為約 ${(i + 1) * CUP_ML} ml`}>
              {partialInner}
            </button>
          );
        })}
      </div>
      {waterMl > VISUAL_CAP_ML ? (
        <p className="text-[11px] leading-tight text-muted-foreground">
          已超過格子總量，仍以數字為準
        </p>
      ) : null}
      {showQuickAdds ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => applyTarget(waterMl + 250)}
            className="inline-flex items-center justify-center gap-1 rounded-[10px] border-[0.5px] border-border bg-secondary px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60">
            + 250 ml
            <ArrowUpRight
              className="h-3.5 w-3.5 shrink-0 opacity-70"
              aria-hidden
            />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => applyTarget(waterMl + 500)}
            className="inline-flex items-center justify-center gap-1 rounded-[10px] border-[0.5px] border-border bg-secondary px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60">
            + 500 ml
            <ArrowUpRight
              className="h-3.5 w-3.5 shrink-0 opacity-70"
              aria-hidden
            />
          </button>
        </div>
      ) : null}
    </div>
  );
}
