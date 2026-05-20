'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { QuickLogInterpretResult } from '@/lib/ai/pending-analysis-jobs-store';
import { activityTypeLabelZh } from '@/lib/activity/activity-type-labels';
import type { MealType, QuickLogValidatedEntry } from '@/lib/quick-log/types';

const MEAL_LABEL_ZH: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

function formatEntryPreview(e: QuickLogValidatedEntry): string {
  switch (e.kind) {
    case 'food':
      return `${MEAL_LABEL_ZH[e.mealType] ?? e.mealType} · ${e.name}（約 ${e.calories} kcal）`;
    case 'activity':
      return `${activityTypeLabelZh(e.activityType)} · ${e.durationMinutes} 分鐘`;
    case 'weight':
      return `體重 ${e.weightKg} kg`;
    case 'water':
      return `飲水 ${e.waterMlTotal} ml（當日總量）`;
    case 'sleep':
      return `睡眠 ${e.sleepHours} 小時`;
    default: {
      const _x: never = e;
      return String(_x);
    }
  }
}

function PreviewEntriesList({
  entries,
  dimmed = false,
}: {
  entries: QuickLogValidatedEntry[];
  dimmed?: boolean;
}) {
  return (
    <ul className={dimmed ? 'space-y-2 opacity-60' : 'space-y-2'}>
      {entries.map((e, idx) => (
        <li
          key={`${e.kind}-${idx}-${formatEntryPreview(e).slice(0, 12)}`}
          className="flex gap-2 text-body text-foreground">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>
            <span className="text-caption text-muted-foreground tabular-nums">
              {idx + 1}.{' '}
            </span>
            {formatEntryPreview(e)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface DashboardAiSpritePreviewProps {
  result: QuickLogInterpretResult;
  referenceDateIso: string;
  waterMlKnownToday?: number | null;
  commitBusy: boolean;
  interpretBusy: boolean;
  isReady: boolean;
  reviseError: string | null;
  commitError: string | null;
  onCommit: () => void;
  onDiscard: () => void;
  onRevise: (opts: {
    revisionInstruction: string;
    referenceDateIso: string;
    currentEntries: QuickLogValidatedEntry[];
    waterMlKnownToday?: number | null;
  }) => void;
  onEditingChange: (editing: boolean) => void;
}

export function DashboardAiSpritePreview({
  result,
  referenceDateIso,
  waterMlKnownToday,
  commitBusy,
  interpretBusy,
  isReady,
  reviseError,
  commitError,
  onCommit,
  onDiscard,
  onRevise,
  onEditingChange,
}: DashboardAiSpritePreviewProps) {
  const [isRevising, setIsRevising] = useState(false);
  const [revisionText, setRevisionText] = useState('');

  useEffect(() => {
    onEditingChange(isRevising);
  }, [isRevising, onEditingChange]);

  const startRevising = useCallback(() => {
    setRevisionText('');
    setIsRevising(true);
  }, []);

  const cancelRevising = useCallback(() => {
    setIsRevising(false);
    setRevisionText('');
  }, []);

  const applyRevision = useCallback(() => {
    const instruction = revisionText.trim();
    if (!instruction) return;
    onRevise({
      revisionInstruction: instruction,
      referenceDateIso,
      currentEntries: result.entries,
      waterMlKnownToday,
    });
    setIsRevising(false);
    setRevisionText('');
  }, [
    onRevise,
    referenceDateIso,
    result.entries,
    revisionText,
    waterMlKnownToday,
  ]);

  const actionsDisabled = commitBusy || interpretBusy;
  const canApplyRevision = revisionText.trim().length > 0;

  return (
    <section className="mt-4 space-y-2 rounded-xl border-hairline border-[#B5D4F4] bg-[#E6F1FB] p-3.5">
      {result.summaryZh ?
        <p className="text-body text-[#2D6B4A]">{result.summaryZh}</p>
      : null}

      {interpretBusy && !isRevising ?
        <p className="text-caption text-muted-foreground">AI 調整中…</p>
      : null}

      {isRevising ?
        <>
          <div className="space-y-2 rounded-[10px] border-hairline border-border bg-background/80 p-3">
            <p className="text-heading-card text-foreground">
              目前解析（共 {result.entries.length} 筆）
            </p>
            <p className="text-caption text-muted-foreground">
              對照下方編號說明要怎麼改
            </p>
            <PreviewEntriesList entries={result.entries} />
          </div>
          <p className="text-heading-card text-foreground">描述要怎麼改</p>
          <p className="text-caption text-muted-foreground">
            例：第 2 筆熱量改 300；刪掉第 3 筆；午餐名稱改成雞腿便當
          </p>
          <label htmlFor="ai-sprite-revision-input" className="sr-only">
            修正說明
          </label>
          <textarea
            id="ai-sprite-revision-input"
            rows={3}
            value={revisionText}
            onChange={(ev) => setRevisionText(ev.target.value)}
            disabled={actionsDisabled}
            placeholder="請用一句話說明要調整的內容"
            className="w-full resize-none rounded-[10px] border-hairline border-[#378ADD]/50 bg-[#F5FAFF] p-3 text-body leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
          />
          {reviseError ?
            <p className="text-caption text-[#E24B4A]" role="alert">
              {reviseError}
            </p>
          : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="default"
              disabled={actionsDisabled || !canApplyRevision}
              onClick={applyRevision}>
              {interpretBusy ?
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  套用修正
                </>
              : '套用修正'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={actionsDisabled}
              onClick={cancelRevising}>
              取消
            </Button>
          </div>
        </>
      : <>
          <p className="text-heading-card text-foreground">
            預覽（共 {result.entries.length} 筆）
          </p>
          <PreviewEntriesList
            entries={result.entries}
            dimmed={interpretBusy}
          />
          {commitError ?
            <p className="text-caption text-[#E24B4A]" role="alert">
              {commitError}
            </p>
          : null}
          {reviseError && !isRevising ?
            <p className="text-caption text-[#E24B4A]" role="alert">
              {reviseError}
            </p>
          : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="default"
              disabled={actionsDisabled || !isReady}
              onClick={onCommit}>
              {commitBusy ?
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  寫入中
                </>
              : '確認寫入'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={actionsDisabled}
              onClick={startRevising}>
              修正
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={actionsDisabled}
              onClick={onDiscard}>
              清除
            </Button>
          </div>
        </>
      }
    </section>
  );
}
