'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import { addFoodFromAiAnalysisAction } from '@/app/(main)/log/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import type {
  ManualFoodAnalysisConfidence,
  ManualFoodAnalysisResult,
} from '@/lib/food/manual-food-analysis-result';

export type StagedFoodItemForPlan = {
  name: string;
  quantity_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number | null;
  sodium_mg: number | null;
  brand: string | null;
};

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type MacroKey = 'calories' | 'protein_g' | 'carb_g' | 'fat_g';

const MACRO_CAL = '#4C956C';
const MACRO_CARB = '#378ADD';
const MACRO_PROTEIN = '#4C956C';
const MACRO_FAT = '#EF9F27';

function normalizeAnalysisPayload(
  raw: ManualFoodAnalysisResult,
): ManualFoodAnalysisResult {
  const conf: ManualFoodAnalysisConfidence =
    raw.confidence === 'high' || raw.confidence === 'medium' ? raw.confidence
    : raw.confidence === 'low' ? 'low'
    : 'medium';

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
    confidence: conf,
    note:
      raw.note === null || raw.note === undefined
        ? null
        : String(raw.note).trim() || null,
  };
}

function ConfidenceBadge({ level }: { level: ManualFoodAnalysisConfidence }) {
  if (level === 'high') {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-[#4C956C]"
          aria-hidden
        />
      </span>
    );
  }
  if (level === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#854F0B]">
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-[#FAC775]"
          aria-hidden
        />
        估算
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#BA7517]">
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-[#EF9F27]"
        aria-hidden
      />
      請確認
    </span>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent',
        className,
      )}
      aria-hidden
    />
  );
}

interface AddFoodManualAiProps {
  mealType: MealType;
  mealLabelZh: string;
  date: string;
  onCommitted: () => void;
  onError?: (message: string) => void;
  stagingOnly?: boolean;
  onStagedItem?: (item: StagedFoodItemForPlan) => void;
}

export function AddFoodManualAiPanel({
  mealType,
  mealLabelZh,
  date,
  onCommitted,
  onError,
  stagingOnly,
  onStagedItem,
}: AddFoodManualAiProps) {
  const [rawInput, setRawInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [result, setResult] = useState<ManualFoodAnalysisResult | null>(null);
  const baselineRef = useRef<ManualFoodAnalysisResult | null>(null);

  const [manual, setManual] = useState<Partial<Record<MacroKey, boolean>>>(
    {},
  );
  const [override, setOverride] = useState<
    Partial<Record<MacroKey, number>>
  >({});

  const [addBusy, setAddBusy] = useState(false);

  const resetOverridesForNewResult = useCallback(
    (next: ManualFoodAnalysisResult) => {
      baselineRef.current = { ...next };
      setManual({});
      setOverride({});
      setResult(next);
    },
    [],
  );

  const runAnalyze = useCallback(async () => {
    const q = rawInput.trim();
    if (q.length < 1) {
      setAnalysisError('請輸入食物描述');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setResult(null);
    baselineRef.current = null;

    try {
      const res = await fetch('/api/ai/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: q }),
      });

      const payload = (await res.json()) as
        | ManualFoodAnalysisResult
        | { error?: string };

      if (!res.ok) {
        setAnalysisError(
          typeof (payload as { error?: string }).error === 'string'
            ? (payload as { error: string }).error
            : '分析失敗',
        );
        return;
      }

      if ('error' in payload && payload.error) {
        setAnalysisError(String(payload.error));
        return;
      }

      const normalized = normalizeAnalysisPayload(
        payload as ManualFoodAnalysisResult,
      );
      resetOverridesForNewResult(normalized);
    } catch {
      setAnalysisError('無法連線分析服務');
    } finally {
      setAnalyzing(false);
    }
  }, [rawInput, resetOverridesForNewResult]);

  const displayMac = useMemo(() => {
    const base = result;
    if (!base) {
      return {
        calories: 0,
        protein_g: 0,
        carb_g: 0,
        fat_g: 0,
      };
    }
    const keys: MacroKey[] = ['calories', 'protein_g', 'carb_g', 'fat_g'];
    const out = {
      calories: base.calories,
      protein_g: base.protein_g,
      carb_g: base.carb_g,
      fat_g: base.fat_g,
    };
    for (const k of keys) {
      if (manual[k] && override[k] != null) {
        out[k] = Math.round(Number(override[k]));
      }
    }
    return out;
  }, [result, manual, override]);

  const hasAdjusted = useMemo(() => {
    const b = baselineRef.current;
    if (!b || !result) return false;
    return (
      displayMac.calories !== b.calories ||
      displayMac.protein_g !== b.protein_g ||
      displayMac.carb_g !== b.carb_g ||
      displayMac.fat_g !== b.fat_g
    );
  }, [displayMac.carb_g, displayMac.calories, displayMac.fat_g, displayMac.protein_g, result]);

  const commitMacro = (key: MacroKey, raw: string) => {
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
  };

  async function onSubmit() {
    if (!result) return;
    setAddBusy(true);

    const payload = {
      mealType,
      date,
      name: result.name,
      quantity_g: result.quantity_g,
      calories: displayMac.calories,
      carb_g: displayMac.carb_g,
      protein_g: displayMac.protein_g,
      fat_g: displayMac.fat_g,
      fiber_g: result.fiber_g,
      sodium_mg: result.sodium_mg,
    };

    if (stagingOnly) {
      onStagedItem?.({
        name: payload.name,
        quantity_g: payload.quantity_g,
        calories: payload.calories,
        carb_g: payload.carb_g,
        protein_g: payload.protein_g,
        fat_g: payload.fat_g,
        fiber_g: payload.fiber_g,
        sodium_mg: payload.sodium_mg,
        brand: null,
      });
      setAddBusy(false);
      setRawInput('');
      setResult(null);
      baselineRef.current = null;
      onCommitted();
      return;
    }

    const err = await addFoodFromAiAnalysisAction(payload);
    setAddBusy(false);
    if (err.error) {
      onError?.(err.error);
      return;
    }
    setRawInput('');
    setResult(null);
    baselineRef.current = null;
    onCommitted();
  }

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runAnalyze();
  };

  const showSecondary =
    result &&
    ((result.fiber_g != null && result.fiber_g > 0) ||
      (result.sodium_mg != null && result.sodium_mg > 0));

  return (
    <div className="space-y-3">
      <form onSubmit={onFormSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={rawInput}
            disabled={analyzing}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="輸入食物與份量，例如：4個雞塊、大杯珍珠奶茶"
            className={cn(
              'min-h-10 min-w-0 flex-1 rounded-[10px] border-[0.5px] border-[#E8E9ED] bg-[var(--color-background-primary)] px-3 py-2 text-[13px] font-normal text-foreground outline-none transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:text-[var(--color-text-tertiary)] disabled:opacity-60',
              'focus:border-[#4C956C] focus:shadow-[0_0_0_2px_rgba(76,149,108,0.12)]',
            )}
          />
          <button
            type="submit"
            disabled={analyzing}
            className={cn(
              'inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-medium text-white transition-opacity duration-150',
              'bg-[#4C956C] hover:opacity-90 disabled:opacity-60',
            )}
          >
            {analyzing ?
              <>
                <Spinner />
                <span className="sr-only">分析中</span>
              </>
            : '分析'}
          </button>
        </div>
      </form>

      {analyzing ?
        <p className="text-[11px] font-normal text-[#9298A8]">AI 分析中...</p>
      : null}

      {analysisError ?
        <p className="text-[13px] text-destructive">{analysisError}</p>
      : null}

      {result ?
        <div className="mt-3 space-y-3 rounded-xl border-[0.5px] border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)] p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-snug text-foreground">
                {result.name}
              </p>
              {result.quantity_description ?
                <p className="mt-0.5 text-[11px] font-normal text-[#9298A8]">
                  {result.quantity_description}
                </p>
              : null}
            </div>
            <div className="shrink-0 pt-0.5">
              <ConfidenceBadge level={result.confidence} />
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-2.5">
            {hasAdjusted ?
              <span className="absolute -top-1 right-0 text-[10px] font-medium text-[#BA7517]">
                已調整
              </span>
            : null}

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

          {result.note ?
            <p className="text-[11px] font-normal leading-relaxed text-[#9298A8]">
              💡 {result.note}
            </p>
          : null}

          {showSecondary ?
            <p className="text-[11px] font-normal leading-snug text-[#9298A8]">
              {result.fiber_g != null && result.fiber_g > 0 ?
                <>纖維 {Math.round(result.fiber_g)}g</>
              : null}
              {result.fiber_g != null &&
              result.fiber_g > 0 &&
              result.sodium_mg != null &&
              result.sodium_mg > 0 ?
                <>　</>
              : null}
              {result.sodium_mg != null && result.sodium_mg > 0 ?
                <>鈉 {Math.round(result.sodium_mg)}mg</>
              : null}
            </p>
          : null}

          {result.confidence === 'low' ?
            <div className="rounded-xl border-[0.5px] border-[#FAC775] bg-[#FDF0D5] p-3 text-[12px] font-normal leading-snug text-foreground">
              ⚠ 此食物資料較少，數值為估算，建議確認後再加入
            </div>
          : null}

          <Button
            type="button"
            className="h-10 w-full rounded-[10px] bg-[#4C956C] text-[13px] font-medium text-white hover:bg-[#4C956C] hover:opacity-90"
            disabled={addBusy}
            onClick={() => void onSubmit()}
          >
            {addBusy ?
              '加入中…'
            : stagingOnly ?
              '加入清單'
            : `加入${mealLabelZh}`}
          </Button>
        </div>
      : null}
    </div>
  );
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
          className="w-full text-left"
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
