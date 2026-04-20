'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ManualFoodAnalysisResult } from '@/lib/food/manual-food-analysis-result';

type MacroKey = 'calories' | 'protein_g' | 'carb_g' | 'fat_g';

const MACRO_CAL = '#4C956C';
const MACRO_CARB = '#378ADD';
const MACRO_PROTEIN = '#4C956C';
const MACRO_FAT = '#EF9F27';

function normalizeAnalysisPayload(
  raw: ManualFoodAnalysisResult,
): ManualFoodAnalysisResult {
  return {
    name: String(raw.name ?? '').trim() || '未命名',
    quantity_g: Math.round(Number(raw.quantity_g) || 0),
    quantity_description: String(raw.quantity_description ?? '').trim(),
    calories: Math.round(Number(raw.calories) || 0),
    protein_g: Math.round(Number(raw.protein_g) || 0),
    carb_g: Math.round(Number(raw.carb_g) || 0),
    fat_g: Math.round(Number(raw.fat_g) || 0),
    fiber_g:
      raw.fiber_g === null || raw.fiber_g === undefined
        ? null
        : Math.round(Number(raw.fiber_g)),
    sodium_mg:
      raw.sodium_mg === null || raw.sodium_mg === undefined
        ? null
        : Math.round(Number(raw.sodium_mg)),
  };
}

function MacroCell({
  labelZh,
  labelEn,
  unit,
  valueColor,
  displayValue,
  onCommit,
}: {
  labelZh: string;
  labelEn: string;
  unit: string;
  valueColor: string;
  displayValue: string;
  onCommit: (raw: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue);

  useEffect(() => {
    if (!editing) setDraft(displayValue);
  }, [displayValue, editing]);

  return (
    <div className="relative rounded-[10px] border-[0.5px] border-border bg-[var(--color-background-secondary)] p-3">
      {editing ?
        <Input
          autoFocus
          className="h-10 border-[0.5px] text-xl font-medium tabular-nums"
          style={{ color: valueColor }}
          value={draft}
          inputMode="decimal"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onCommit(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onCommit(draft);
              setEditing(false);
            }
          }}
        />
      : (
        <button
          type="button"
          className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
          onClick={() => setEditing(true)}
        >
          <div
            className="tabular-nums text-xl font-medium"
            style={{ color: valueColor }}
          >
            {displayValue}
          </div>
          <div className="text-[11px] font-normal text-muted-foreground">{unit}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {labelZh}
            {labelEn ?
              <span className="opacity-70"> {labelEn}</span>
            : null}
          </div>
        </button>
      )}
    </div>
  );
}

export interface NutritionResultCardProps {
  result: ManualFoodAnalysisResult;
  /** 加入紀錄按鈕文案（editMode 時省略） */
  mealLabelZh?: string;
  previewImageUrl?: string;
  stagingOnly?: boolean;
  confirmBusy?: boolean;
  onConfirm: (edited: ManualFoodAnalysisResult) => void;
  /** 已紀錄項目編輯：顯示取消／儲存 */
  editMode?: boolean;
  onCancel?: () => void;
  editBusy?: boolean;
  /** 內嵌於紀錄列展開區，移除外層卡片框線 */
  embedded?: boolean;
}

export function NutritionResultCard({
  result: resultProp,
  mealLabelZh,
  previewImageUrl,
  stagingOnly,
  confirmBusy,
  onConfirm,
  editMode = false,
  onCancel,
  editBusy,
  embedded = false,
}: NutritionResultCardProps) {
  const [originalResult, setOriginalResult] = useState<ManualFoodAnalysisResult>(
    () => normalizeAnalysisPayload(resultProp),
  );
  const [displayResult, setDisplayResult] = useState<ManualFoodAnalysisResult>(
    () => normalizeAnalysisPayload(resultProp),
  );
  const [quantity, setQuantity] = useState(() => {
    const q = Math.round(Number(normalizeAnalysisPayload(resultProp).quantity_g));
    return q > 0 ? q : 1;
  });

  const [manual, setManual] = useState<Partial<Record<MacroKey, boolean>>>(
    {},
  );
  const [override, setOverride] = useState<
    Partial<Record<MacroKey, number>>
  >({});

  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(
    () => normalizeAnalysisPayload(resultProp).name,
  );
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  useEffect(() => {
    const next = normalizeAnalysisPayload(resultProp);
    setOriginalResult(next);
    setDisplayResult(next);
    setDisplayName(next.name);
    const q = Math.round(Number(next.quantity_g));
    setQuantity(q > 0 ? q : 1);
    setManual({});
    setOverride({});
    setIsEditingName(false);
    setIsReanalyzing(false);
  }, [resultProp]);

  const handleQuantityChange = useCallback(
    (newQuantity: number) => {
      if (
        !Number.isFinite(newQuantity) ||
        newQuantity < 1 ||
        !originalResult
      ) {
        return;
      }
      const denom =
        originalResult.quantity_g > 0 ? originalResult.quantity_g : 1;
      const ratio = newQuantity / denom;
      const nameKeep = displayName.trim() || originalResult.name;
      setQuantity(newQuantity);
      setDisplayResult({
        ...originalResult,
        name: nameKeep,
        quantity_g: newQuantity,
        calories: Math.round(originalResult.calories * ratio),
        protein_g: Math.round(originalResult.protein_g * ratio),
        carb_g: Math.round(originalResult.carb_g * ratio),
        fat_g: Math.round(originalResult.fat_g * ratio),
        fiber_g:
          originalResult.fiber_g != null
            ? Math.round(originalResult.fiber_g * ratio)
            : null,
        sodium_mg:
          originalResult.sodium_mg != null
            ? Math.round(originalResult.sodium_mg * ratio)
            : null,
      });
      setManual({});
      setOverride({});
    },
    [displayName, originalResult],
  );

  const displayMac = useMemo(() => {
    const keys: MacroKey[] = ['calories', 'protein_g', 'carb_g', 'fat_g'];
    const out = {
      calories: displayResult.calories,
      protein_g: displayResult.protein_g,
      carb_g: displayResult.carb_g,
      fat_g: displayResult.fat_g,
    };
    for (const k of keys) {
      if (manual[k] && override[k] != null) {
        out[k] = Math.round(Number(override[k]));
      }
    }
    return out;
  }, [displayResult, manual, override]);

  const commitMacro = useCallback((key: MacroKey, raw: string) => {
    const n = Math.round(parseFloat(raw.replace(',', '.')));
    if (!Number.isFinite(n) || n < 0) {
      setManual((m) => ({ ...m, [key]: false }));
      setOverride((o) => {
        const next = { ...o };
        delete next[key];
        return next;
      });
      return;
    }
    setManual((m) => ({ ...m, [key]: true }));
    setOverride((o) => ({ ...o, [key]: n }));
  }, []);

  const finishEditingName = useCallback(() => {
    const trimmed = displayName.trim();
    const resolved = trimmed || originalResult.name;
    setDisplayName(resolved);
    setDisplayResult((prev) => ({ ...prev, name: resolved }));
    setIsEditingName(false);
  }, [displayName, originalResult.name]);

  const handleReanalyze = useCallback(async () => {
    const nameResolved = displayName.trim() || originalResult.name;
    if (!nameResolved || isReanalyzing) return;

    setIsReanalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameResolved,
          quantity,
        }),
      });
      if (!res.ok) return;

      const payload = (await res.json()) as
        | ManualFoodAnalysisResult
        | { error?: string };
      if ('error' in payload && payload.error) return;
      if (!('calories' in payload)) return;
      const next = normalizeAnalysisPayload({
        ...payload,
        name: payload.name?.trim() || nameResolved,
        quantity_g: quantity,
      });
      setOriginalResult(next);
      setDisplayResult(next);
      setDisplayName(next.name);
      setManual({});
      setOverride({});
    } catch (error) {
      console.error('重新分析失敗', error);
    } finally {
      setIsReanalyzing(false);
    }
  }, [displayName, isReanalyzing, originalResult.name, quantity]);

  const handleConfirm = useCallback(() => {
    const nameResolved = displayName.trim() || originalResult.name;
    const payload: ManualFoodAnalysisResult = {
      ...displayResult,
      name: nameResolved,
      quantity_g: quantity,
      calories: displayMac.calories,
      protein_g: displayMac.protein_g,
      carb_g: displayMac.carb_g,
      fat_g: displayMac.fat_g,
    };
    onConfirm(payload);
  }, [
    displayMac,
    displayName,
    displayResult,
    originalResult.name,
    onConfirm,
    quantity,
  ]);

  const showSecondary =
    (displayResult.fiber_g != null && displayResult.fiber_g > 0) ||
    (displayResult.sodium_mg != null && displayResult.sodium_mg > 0);
  const nameWasChanged = displayName !== originalResult.name;

  const outerClass = embedded ?
      'mt-0 space-y-3'
    : 'mt-3 space-y-3 rounded-xl border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-4';

  const busy = editMode ? editBusy : confirmBusy;

  return (
    <div className={outerClass}>
      {previewImageUrl ?
        <div className="h-48 w-full overflow-hidden rounded-lg bg-[#F4F4F6]">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob / external meal photos */}
          <img
            src={previewImageUrl}
            alt="餐點照片"
            className="h-full w-full object-cover"
          />
        </div>
      : null}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isEditingName ?
            <input
              autoFocus
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => finishEditingName()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  finishEditingName();
                }
              }}
              className="w-full border-b border-[#4C956C] bg-transparent pb-0.5 text-[15px] font-medium text-[#1E212B] outline-none"
            />
          : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="flex max-w-full items-start gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            >
              <span className="min-w-0 break-words text-[15px] font-medium leading-snug text-[#1E212B]">
                {displayName}
              </span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                className="mt-0.5 shrink-0 opacity-60 text-[#9298A8]"
                aria-hidden
              >
                <path
                  d="M9 2L11 4L4 11H2V9L9 2Z"
                  stroke="currentColor"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </button>
          )}
          {displayResult.quantity_description ?
            <p className="mt-0.5 text-[11px] font-normal text-[#9298A8]">
              {displayResult.quantity_description}
            </p>
          : null}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 border-b-[0.5px] border-[#E8E9ED] py-2">
        <span className="flex-1 text-[12px] text-[#4A4F63]">實際份量</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={quantity}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') return;
            const v = Number(raw);
            if (!Number.isFinite(v)) return;
            handleQuantityChange(Math.max(1, Math.floor(v)));
          }}
          className="w-20 rounded-lg border-[0.5px] border-[#E8E9ED] px-2 py-1 text-right text-[13px] font-medium outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#4C956C] focus:ring-1 focus:ring-[#4C956C]/20"
        />
        <span className="text-[12px] text-[#9298A8]">g</span>
        <button
          type="button"
          onClick={() => void handleReanalyze()}
          disabled={isReanalyzing}
          className="ml-2 flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-[#4C956C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isReanalyzing ?
            <>
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 12 12" fill="none">
                <circle
                  cx="6"
                  cy="6"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="16"
                  strokeDashoffset="8"
                />
              </svg>
              分析中
            </>
          : <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M10 6A4 4 0 112 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M10 3v3H7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              重新分析
            </>
          }
        </button>
        {nameWasChanged ?
          <span className="ml-1 text-[10px] text-[#BA7517]">名稱已修改</span>
        : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <MacroCell
          labelZh="熱量"
          labelEn=""
          unit="kcal"
          valueColor={MACRO_CAL}
          displayValue={String(displayMac.calories)}
          onCommit={(v) => commitMacro('calories', v)}
        />
        <MacroCell
          labelZh="蛋白質"
          labelEn="protein"
          unit="g"
          valueColor={MACRO_PROTEIN}
          displayValue={String(displayMac.protein_g)}
          onCommit={(v) => commitMacro('protein_g', v)}
        />
        <MacroCell
          labelZh="碳水"
          labelEn="carb"
          unit="g"
          valueColor={MACRO_CARB}
          displayValue={String(displayMac.carb_g)}
          onCommit={(v) => commitMacro('carb_g', v)}
        />
        <MacroCell
          labelZh="脂肪"
          labelEn="fat"
          unit="g"
          valueColor={MACRO_FAT}
          displayValue={String(displayMac.fat_g)}
          onCommit={(v) => commitMacro('fat_g', v)}
        />
      </div>

      {showSecondary ?
        <p className="text-[11px] font-normal leading-snug text-[#9298A8]">
          {displayResult.fiber_g != null && displayResult.fiber_g > 0 ?
            <>纖維 {Math.round(displayResult.fiber_g)}g</>
          : null}
          {displayResult.fiber_g != null &&
          displayResult.fiber_g > 0 &&
          displayResult.sodium_mg != null &&
          displayResult.sodium_mg > 0 ?
            <>　</>
          : null}
          {displayResult.sodium_mg != null && displayResult.sodium_mg > 0 ?
            <>鈉 {Math.round(displayResult.sodium_mg)}mg</>
          : null}
        </p>
      : null}

      {editMode ?
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            className="h-10 min-h-10 flex-1 border-[0.5px]"
            disabled={busy}
            onClick={() => onCancel?.()}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-10 min-h-10 flex-1"
            disabled={busy}
            onClick={() => handleConfirm()}
          >
            {busy ? '儲存中…' : '儲存修改'}
          </Button>
        </div>
      : (
        <Button
          type="button"
          variant="default"
          className="h-10 w-full rounded-[10px] text-[13px] font-medium"
          disabled={busy}
          onClick={() => handleConfirm()}
        >
          {busy ?
            '加入中…'
          : stagingOnly ?
            '加入清單'
          : `加入${mealLabelZh ?? ''}`}
        </Button>
      )}
    </div>
  );
}
