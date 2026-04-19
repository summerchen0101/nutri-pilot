'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { addFoodFromSearchAction } from '@/app/(main)/log/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import type { FoodCacheRow } from '@/lib/food/search';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type MacroKey = 'calories' | 'protein_g' | 'carb_g' | 'fat_g';

function inferPortionCategory(
  name: string,
): 'generic' | 'starch' | 'meat' | 'drink' {
  const s = name.trim();
  if (
    /飲料|奶茶|牛奶|咖啡|茶|果汁|汽水|可樂|啤酒|拿鐵|美式|紅茶|綠茶|豆漿|奶昔|可可|汽水|養樂多/.test(
      s,
    )
  ) {
    return 'drink';
  }
  if (
    /飯|麵|粥|冬粉|米粉|河粉|粿條|義大利麵|拉麵|烏龍|泡麵|餃|壽司|吐司|麵包|蘿蔔糕|鍋燒|炒飯/.test(
      s,
    )
  ) {
    return 'starch';
  }
  if (/肉|雞|豬|牛|羊|魚|蝦|蟹|花枝|蛤|蚵|雞胸|排骨|培根|火腿|香腸|蛋|鴨|鵝/.test(s)) {
    return 'meat';
  }
  return 'generic';
}

function quickPortions(
  cat: ReturnType<typeof inferPortionCategory>,
): { label: string; amount: number }[] {
  switch (cat) {
    case 'starch':
      return [
        { label: '半碗 100g', amount: 100 },
        { label: '一碗 200g', amount: 200 },
        { label: '一碗半 300g', amount: 300 },
      ];
    case 'meat':
      return [
        { label: '半份 75g', amount: 75 },
        { label: '一份 150g', amount: 150 },
        { label: '一份半 225g', amount: 225 },
      ];
    case 'drink':
      return [
        { label: '240ml', amount: 240 },
        { label: '360ml', amount: 360 },
        { label: '480ml', amount: 480 },
        { label: '700ml', amount: 700 },
      ];
    default:
      return [
        { label: '30g', amount: 30 },
        { label: '50g', amount: 50 },
        { label: '100g', amount: 100 },
        { label: '150g', amount: 150 },
        { label: '200g', amount: 200 },
      ];
  }
}

function foodSourceDot(row: FoodCacheRow): { bg: string; title: string } {
  if (row.source === 'ai_estimate')
    return { bg: '#EF9F27', title: 'AI 估算' };
  if (row.source === 'mohw_tw') return { bg: '#4C956C', title: '衛福部' };
  if (row.source === 'usda') return { bg: '#378ADD', title: 'USDA' };
  return { bg: '#94a3b8', title: '資料庫' };
}

function scaleNutrientInt(
  per100: number | null | undefined,
  portionAmount: number,
): number | null {
  if (per100 == null || !Number.isFinite(Number(per100))) return null;
  if (!Number.isFinite(portionAmount) || portionAmount <= 0) return null;
  return Math.round((Number(per100) / 100) * portionAmount);
}

function parsePortionAmount(s: string): number {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export function FoodSourceDotInline({ row }: { row: FoodCacheRow }) {
  const { bg, title } = foodSourceDot(row);
  return (
    <span
      title={title}
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: bg }}
      aria-hidden
    />
  );
}

interface AddFoodFromSearchProps {
  selectedHit: FoodCacheRow;
  mealType: MealType;
  mealLabelZh: string;
  date: string;
  onCommitted: () => void;
  onError?: (message: string) => void;
}

const MACRO_CAL = '#4C956C';
const MACRO_CARB = '#378ADD';
const MACRO_PROTEIN = '#4C956C';
const MACRO_FAT = '#EF9F27';

export function AddFoodFromSearchPanel({
  selectedHit,
  mealType,
  mealLabelZh,
  date,
  onCommitted,
  onError,
}: AddFoodFromSearchProps) {
  const [portionStr, setPortionStr] = useState('100');
  const [portionUnit, setPortionUnit] = useState<'g' | 'ml'>('g');
  const [manual, setManual] = useState<Partial<Record<MacroKey, boolean>>>(
    {},
  );
  const [override, setOverride] = useState<
    Partial<Record<MacroKey, number>>
  >({});
  const [aiConfirmed, setAiConfirmed] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  const category = useMemo(
    () => inferPortionCategory(selectedHit.name),
    [selectedHit.name],
  );
  const presets = useMemo(() => quickPortions(category), [category]);

  useEffect(() => {
    const cat = inferPortionCategory(selectedHit.name);
    setPortionStr(cat === 'drink' ? '240' : '100');
    setPortionUnit(cat === 'drink' ? 'ml' : 'g');
    setManual({});
    setOverride({});
    setAiConfirmed(false);
  }, [selectedHit.id, selectedHit.name]);

  const portionAmount = parsePortionAmount(portionStr);

  const computed = useMemo(() => {
    const q =
      Number.isFinite(portionAmount) && portionAmount > 0
        ? portionAmount
        : 0;
    return {
      calories: Math.round(
        (selectedHit.calories_per_100g / 100) * q,
      ),
      protein_g: Math.round(
        (selectedHit.protein_g_per_100g / 100) * q,
      ),
      carb_g: Math.round((selectedHit.carb_g_per_100g / 100) * q),
      fat_g: Math.round((selectedHit.fat_g_per_100g / 100) * q),
    };
  }, [selectedHit, portionAmount]);

  const displayMac = useMemo(() => {
    const keys: MacroKey[] = [
      'calories',
      'protein_g',
      'carb_g',
      'fat_g',
    ];
    const out: Record<MacroKey, number> = {
      calories: 0,
      protein_g: 0,
      carb_g: 0,
      fat_g: 0,
    };
    for (const k of keys) {
      out[k] =
        manual[k] && override[k] != null
          ? Math.round(Number(override[k]))
          : computed[k];
    }
    return out;
  }, [computed, manual, override]);

  const fiberMg = useMemo(() => {
    const q =
      Number.isFinite(portionAmount) && portionAmount > 0
        ? portionAmount
        : 0;
    return scaleNutrientInt(selectedHit.fiber_g_per_100g, q);
  }, [selectedHit.fiber_g_per_100g, portionAmount]);

  const sodiumMg = useMemo(() => {
    const q =
      Number.isFinite(portionAmount) && portionAmount > 0
        ? portionAmount
        : 0;
    return scaleNutrientInt(selectedHit.sodium_mg_per_100g, q);
  }, [selectedHit.sodium_mg_per_100g, portionAmount]);

  const showSecondary =
    (fiberMg != null && fiberMg > 0) ||
    (sodiumMg != null && sodiumMg > 0);

  const hasManual = Object.values(manual).some(Boolean);

  const canSubmit =
    Number.isFinite(portionAmount) &&
    portionAmount > 0 &&
    !(selectedHit.source === 'ai_estimate' && !aiConfirmed);

  const resetMacrosForQuantity = useCallback(() => {
    setManual({});
    setOverride({});
  }, []);

  const onPortionStrChange = (v: string) => {
    setPortionStr(v);
    resetMacrosForQuantity();
  };

  const setPortionFromPreset = (amount: number) => {
    setPortionStr(String(amount));
    resetMacrosForQuantity();
  };

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
    if (!canSubmit) return;
    setAddBusy(true);
    const q = portionAmount;
    const result = await addFoodFromSearchAction({
      mealType,
      date,
      quantityG: q,
      confirmedAiEstimate:
        selectedHit.source === 'ai_estimate' ? aiConfirmed : undefined,
      isVerified: !hasManual,
      macros: {
        calories: displayMac.calories,
        carb_g: displayMac.carb_g,
        protein_g: displayMac.protein_g,
        fat_g: displayMac.fat_g,
      },
      fiber_g: fiberMg,
      sodium_mg: sodiumMg,
      hit: {
        name: selectedHit.name,
        brand: selectedHit.brand,
        calories_per_100g: selectedHit.calories_per_100g,
        carb_g_per_100g: selectedHit.carb_g_per_100g,
        protein_g_per_100g: selectedHit.protein_g_per_100g,
        fat_g_per_100g: selectedHit.fat_g_per_100g,
        source: selectedHit.source,
      },
    });
    setAddBusy(false);
    if (result.error) {
      onError?.(result.error);
      return;
    }
    onCommitted();
  }

  return (
    <div className="mt-3 space-y-4 rounded-xl border-[0.5px] border-border bg-secondary p-4">
      {/* 份量 */}
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-foreground">份量</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
          {presets.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              className="h-8 shrink-0 rounded-[10px] px-3 text-[11px] font-medium"
              onClick={() => setPortionFromPreset(p.amount)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            inputMode="decimal"
            className="min-w-[100px] flex-1 rounded-[10px] text-[13px]"
            value={portionStr}
            onChange={(e) => onPortionStrChange(e.target.value)}
            placeholder="份量"
            aria-label="份量數字"
          />
          <div className="flex shrink-0 rounded-[10px] border-[0.5px] border-border bg-card p-0.5">
            <button
              type="button"
              className={cn(
                'rounded-[8px] px-3 py-1 text-[11px] font-medium transition-colors duration-150',
                portionUnit === 'g'
                  ? 'bg-[#E8F5EE] text-[#4C956C]'
                  : 'text-muted-foreground',
              )}
              onClick={() => setPortionUnit('g')}
            >
              g
            </button>
            <button
              type="button"
              className={cn(
                'rounded-[8px] px-3 py-1 text-[11px] font-medium transition-colors duration-150',
                portionUnit === 'ml'
                  ? 'bg-[#E8F5EE] text-[#4C956C]'
                  : 'text-muted-foreground',
              )}
              onClick={() => setPortionUnit('ml')}
            >
              ml
            </button>
          </div>
        </div>
      </div>

      {/* 營養 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        <MacroCell
          labelZh="熱量"
          labelEn=""
          unit="kcal"
          valueColor={MACRO_CAL}
          adjusted={Boolean(manual.calories)}
          displayValue={String(displayMac.calories)}
          onCommit={(v) => commitMacro('calories', v)}
        />
        <MacroCell
          labelZh="蛋白質"
          labelEn="protein"
          unit="g"
          valueColor={MACRO_PROTEIN}
          adjusted={Boolean(manual.protein_g)}
          displayValue={String(displayMac.protein_g)}
          onCommit={(v) => commitMacro('protein_g', v)}
        />
        <MacroCell
          labelZh="碳水"
          labelEn="carb"
          unit="g"
          valueColor={MACRO_CARB}
          adjusted={Boolean(manual.carb_g)}
          displayValue={String(displayMac.carb_g)}
          onCommit={(v) => commitMacro('carb_g', v)}
        />
        <MacroCell
          labelZh="脂肪"
          labelEn="fat"
          unit="g"
          valueColor={MACRO_FAT}
          adjusted={Boolean(manual.fat_g)}
          displayValue={String(displayMac.fat_g)}
          onCommit={(v) => commitMacro('fat_g', v)}
        />
      </div>

      {showSecondary ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {fiberMg != null && fiberMg > 0 ? <>纖維 {fiberMg}g</> : null}
          {fiberMg != null &&
          fiberMg > 0 &&
          sodiumMg != null &&
          sodiumMg > 0 ? (
            <>　</>
          ) : null}
          {sodiumMg != null && sodiumMg > 0 ? <>鈉 {sodiumMg}mg</> : null}
        </p>
      ) : null}

      {selectedHit.source === 'ai_estimate' ? (
        <div className="rounded-xl border-[0.5px] border-[#FAC775] bg-[#FDF0D5] px-3 py-2.5">
          <p className="text-[13px] font-medium text-[#854F0B]">
            AI 估算，請確認後再加入
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            營養數值為模型推估，加入飲食紀錄前請自行核對。
          </p>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-[6px] border-[0.5px] border-border accent-[#4C956C]"
              checked={aiConfirmed}
              onChange={(e) => setAiConfirmed(e.target.checked)}
            />
            <span>我已確認營養資料可接受</span>
          </label>
        </div>
      ) : null}

      <Button
        type="button"
        className="h-10 w-full rounded-[10px] text-[13px] font-medium"
        disabled={addBusy || !canSubmit}
        onClick={() => void onSubmit()}
      >
        {addBusy ? '加入中…' : `加入${mealLabelZh}`}
      </Button>
    </div>
  );
}

function MacroCell({
  labelZh,
  labelEn,
  unit,
  valueColor,
  adjusted,
  displayValue,
  onCommit,
}: {
  labelZh: string;
  labelEn: string;
  unit: string;
  valueColor: string;
  adjusted: boolean;
  displayValue: string;
  onCommit: (raw: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue);

  useEffect(() => {
    if (!editing) setDraft(displayValue);
  }, [displayValue, editing]);

  return (
    <div className="relative rounded-[10px] border-[0.5px] border-border bg-card p-3">
      {adjusted ? (
        <span className="absolute right-2 top-1.5 text-[11px] font-medium text-[#BA7517]">
          已手動調整
        </span>
      ) : null}
      {editing ? (
        <Input
          autoFocus
          className="h-10 border-[0.5px] text-xl font-medium tabular-nums"
          style={{ color: valueColor }}
          value={draft}
          inputMode="numeric"
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
      ) : (
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
          <div className="text-[11px] text-muted-foreground">{unit}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {labelZh}
            {labelEn ? (
              <span className="opacity-70"> {labelEn}</span>
            ) : null}
          </div>
        </button>
      )}
    </div>
  );
}
