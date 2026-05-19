'use client';

import { useCallback, useMemo, useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';

import { updateFoodLogItemAction } from '@/app/(main)/log/actions';
import { LOG_FOOD_LIST_TITLE } from '@/lib/log/log-date-label';
import {
  MEAL_LABEL,
  MEAL_ORDER,
  logItemToManualResult,
  type FoodLogSnapshot,
  type LogItemSnapshot,
} from '@/app/(main)/log/log-food-snapshot';
import { NutritionResultCard } from '@/components/food/NutritionResultCard';
import type { ManualFoodAnalysisResult } from '@/lib/food/manual-food-analysis-result';

function roundMacroG(n: number): number {
  return Math.round(Number(n));
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

function TrashIcon(props: { className?: string }) {
  return <FiTrash2 className={props.className} aria-hidden />;
}

export interface FoodLogDayListProps {
  logs: FoodLogSnapshot[];
  readOnly?: boolean;
  listTitle?: string;
  onDeleteLog?: (logId: string) => void | Promise<void>;
  onItemSaved?: () => void;
  onActionError?: (message: string) => void;
}

export function FoodLogDayList({
  logs,
  readOnly = false,
  listTitle = LOG_FOOD_LIST_TITLE,
  onDeleteLog,
  onItemSaved,
  onActionError,
}: FoodLogDayListProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, FoodLogSnapshot[]>();
    for (const k of MEAL_ORDER) map.set(k, []);
    for (const log of logs) {
      const key = log.meal_type in MEAL_LABEL ? log.meal_type : 'snack';
      const arr = map.get(key);
      if (arr) arr.push(log);
    }
    return map;
  }, [logs]);

  const handleSaveEditedItem = useCallback(
    async (itemId: string, edited: ManualFoodAnalysisResult) => {
      setEditSaving(true);
      const res = await updateFoodLogItemAction({
        itemId,
        name: edited.name,
        quantity_g: edited.quantity_g,
        calories: edited.calories,
        carb_g: edited.carb_g,
        protein_g: edited.protein_g,
        fat_g: edited.fat_g,
        fiber_g: edited.fiber_g,
        sodium_mg: edited.sodium_mg,
      });
      setEditSaving(false);
      if (res.error) {
        onActionError?.(res.error);
        return;
      }
      setExpandedItemId(null);
      onItemSaved?.();
    },
    [onActionError, onItemSaved],
  );

  return (
    <div className="space-y-2.5">
      <h2 className="text-[15px] font-medium text-foreground">{listTitle}</h2>
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
                              {readOnly ? (
                                <div className="flex gap-2 p-3">
                                  <span
                                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
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
                              ) : (
                                <>
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
                                      if (
                                        e.key === 'Enter' ||
                                        e.key === ' '
                                      ) {
                                        e.preventDefault();
                                        setExpandedItemId((prev) =>
                                          prev === it.id ? null : it.id,
                                        );
                                      }
                                    }}
                                  >
                                    <span
                                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
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
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        {!readOnly && onDeleteLog ? (
                          <button
                            type="button"
                            className="shrink-0 self-stretch px-3 py-3 text-muted-foreground transition-colors hover:text-destructive"
                            aria-label="刪除此筆紀錄"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onDeleteLog(log.id);
                            }}
                          >
                            <TrashIcon className="mx-auto h-4 w-4" />
                          </button>
                        ) : null}
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
  );
}
