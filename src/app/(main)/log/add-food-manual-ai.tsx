'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { addFoodFromAiAnalysisAction } from '@/app/(main)/log/actions';
import { NutritionResultCard } from '@/components/food/NutritionResultCard';
import { cn } from '@/lib/utils/cn';
import type { ManualFoodAnalysisResult } from '@/lib/food/manual-food-analysis-result';

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
  /** 由「選擇常用」等外部觸發；`version` 每次遞增即套用 `result`。 */
  applyHistoryPrefill?: {
    version: number;
    result: ManualFoodAnalysisResult;
  } | null;
}

export function AddFoodManualAiPanel({
  mealType,
  mealLabelZh,
  date,
  onCommitted,
  onError,
  stagingOnly,
  onStagedItem,
  applyHistoryPrefill,
}: AddFoodManualAiProps) {
  const [rawInput, setRawInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [result, setResult] = useState<ManualFoodAnalysisResult | null>(null);

  const [addBusy, setAddBusy] = useState(false);

  const resetResult = useCallback((next: ManualFoodAnalysisResult) => {
    setResult(normalizeAnalysisPayload(next));
  }, []);

  useEffect(() => {
    if (!applyHistoryPrefill || applyHistoryPrefill.version < 1) return;
    setRawInput('');
    setAnalysisError(null);
    setAnalyzing(false);
    setResult(normalizeAnalysisPayload(applyHistoryPrefill.result));
  }, [applyHistoryPrefill]);

  const runAnalyze = useCallback(async () => {
    const q = rawInput.trim();
    if (q.length < 1) {
      setAnalysisError('請輸入食物描述');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setResult(null);

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

      resetResult(payload as ManualFoodAnalysisResult);
    } catch {
      setAnalysisError('無法連線分析服務');
    } finally {
      setAnalyzing(false);
    }
  }, [rawInput, resetResult]);

  async function handleConfirm(edited: ManualFoodAnalysisResult) {
    setAddBusy(true);

    const payload = {
      mealType,
      date,
      name: edited.name,
      quantity_g: edited.quantity_g,
      calories: edited.calories,
      carb_g: edited.carb_g,
      protein_g: edited.protein_g,
      fat_g: edited.fat_g,
      fiber_g: edited.fiber_g,
      sodium_mg: edited.sodium_mg,
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
    onCommitted();
  }

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runAnalyze();
  };

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
              'bg-[#4C956C] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1 disabled:opacity-60',
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
        <NutritionResultCard
          result={result}
          mealLabelZh={mealLabelZh}
          stagingOnly={stagingOnly}
          confirmBusy={addBusy}
          onConfirm={(edited) => void handleConfirm(edited)}
          onReselect={() => {
            setResult(null);
            setRawInput('');
            setAnalysisError(null);
            setAnalyzing(false);
          }}
        />
      : null}
    </div>
  );
}
