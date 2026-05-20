'use client';

import { Loader2, Mic, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { DashboardAiSpriteInput } from '@/app/(main)/dashboard/dashboard-ai-sprite-input';
import { DashboardAiSpritePreview } from '@/app/(main)/dashboard/dashboard-ai-sprite-preview';
import { addFoodFromAiAnalysisAction } from '@/app/(main)/log/actions';
import { insertActivityLogAction } from '@/app/(main)/log/activity-actions';
import {
  logWeightForDateAction,
  setSleepHoursForDateAction,
  setWaterMlForDateAction,
} from '@/app/(main)/log/vitals-actions';
import {
  HEADER_ACTION_ICON_CLASS,
} from '@/components/layout/header-action-icon-styles';
import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { useDashboardAiSprite } from '@/hooks/use-dashboard-ai-sprite';
import type { ClaudeImagePayload } from '@/lib/ai/image-file-to-claude-payload';
import { usePendingAnalysisJobsStore } from '@/lib/ai/pending-analysis-jobs-store';
import type { QuickLogValidatedEntry } from '@/lib/quick-log/types';
import {
  QUICK_LOG_UNRECOGNIZABLE_HINT,
  QUICK_LOG_UNRECOGNIZABLE_TITLE,
} from '@/lib/quick-log/messages';

interface SpeechRecoInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
}

function pickSpeechRecoCtor(): (new () => SpeechRecoInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecoInstance;
    webkitSpeechRecognition?: new () => SpeechRecoInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function transcriptFromResultEvent(ev: Event): string {
  const unk = ev as unknown as {
    results?: ArrayLike<{ 0?: { transcript?: string } }>;
  };
  const first = unk.results?.[0];
  const t = first?.[0]?.transcript;
  return typeof t === 'string' ? t.trim() : '';
}

async function commitQuickLogEntries(
  entries: QuickLogValidatedEntry[],
): Promise<{ ok: true } | { ok: false; index: number; message: string }> {
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    switch (entry.kind) {
      case 'food': {
        const res = await addFoodFromAiAnalysisAction({
          mealType: entry.mealType,
          date: entry.date,
          name: entry.name,
          quantity_g: entry.quantity_g,
          calories: entry.calories,
          carb_g: entry.carb_g,
          protein_g: entry.protein_g,
          fat_g: entry.fat_g,
          fiber_g: entry.fiber_g,
          sodium_mg: entry.sodium_mg,
        });
        if (res.error) return { ok: false, index: i, message: res.error };
        break;
      }
      case 'activity': {
        const res = await insertActivityLogAction({
          loggedDate: entry.loggedDate,
          activityType: entry.activityType,
          durationMinutes: entry.durationMinutes,
          caloriesEst: entry.caloriesEst,
          notes: entry.notes,
        });
        if (res.error) return { ok: false, index: i, message: res.error };
        break;
      }
      case 'weight': {
        const res = await logWeightForDateAction(
          entry.dateIso,
          entry.weightKg,
        );
        if (res.error) return { ok: false, index: i, message: res.error };
        break;
      }
      case 'water': {
        const res = await setWaterMlForDateAction(
          entry.dateIso,
          entry.waterMlTotal,
        );
        if (res.error) return { ok: false, index: i, message: res.error };
        break;
      }
      case 'sleep': {
        const res = await setSleepHoursForDateAction(
          entry.dateIso,
          entry.sleepHours,
        );
        if (res.error) return { ok: false, index: i, message: res.error };
        break;
      }
      default: {
        const neverEntry: never = entry;
        return {
          ok: false,
          index: i,
          message: String(neverEntry),
        };
      }
    }
  }
  return { ok: true };
}

export function DashboardAiSprite({
  todayIsoDate,
  waterMlKnownToday = null,
  sheetOpen,
  onSheetOpenChange,
}: {
  todayIsoDate: string;
  waterMlKnownToday?: number | null;
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [draftMessage, setDraftMessage] = useState('');
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [speechListening, setSpeechListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imagePayload, setImagePayload] = useState<ClaudeImagePayload | null>(
    null,
  );
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);

  const quickLog = usePendingAnalysisJobsStore((s) => s.quickLog);
  const setQuickLogMessage = usePendingAnalysisJobsStore((s) => s.setQuickLogMessage);
  const setSpriteSheetOpen = usePendingAnalysisJobsStore((s) => s.setSpriteSheetOpen);
  const clearQuickLog = usePendingAnalysisJobsStore((s) => s.clearQuickLog);

  const { busy: interpretBusy, error, result, isReady, interpret, revise } =
    useDashboardAiSprite();

  const message = quickLog?.message ?? draftMessage;
  const hasAttachedImage = imagePayload != null;
  const canInterpret =
    (message.trim().length > 0 || hasAttachedImage) &&
    !imageProcessing;
  const inputsDisabled = interpretBusy || commitBusy || isEditingPreview;
  const hasEmptyInterpretResult =
    isReady && result != null && result.entries.length === 0;
  const emptySummaryZh =
    hasEmptyInterpretResult && result?.summaryZh ?
      result.summaryZh.trim()
    : null;
  const showEmptyAiSummary =
    emptySummaryZh != null &&
    emptySummaryZh !== QUICK_LOG_UNRECOGNIZABLE_TITLE &&
    emptySummaryZh !== QUICK_LOG_UNRECOGNIZABLE_HINT;

  const clearAttachedImage = useCallback(() => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setImagePayload(null);
    setImageError(null);
  }, [previewUrl]);

  const updateMessage = useCallback(
    (next: string) => {
      if (quickLog) setQuickLogMessage(next);
      else setDraftMessage(next);
    },
    [quickLog, setQuickLogMessage],
  );

  const recRef = useRef<SpeechRecoInstance | null>(null);

  useEffect(() => {
    setSpeechSupported(pickSpeechRecoCtor() != null);
  }, []);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    setSpriteSheetOpen(sheetOpen);
  }, [sheetOpen, setSpriteSheetOpen]);

  const stopSpeech = useCallback(() => {
    setSpeechListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    onSheetOpenChange(false);
    setCommitError(null);
    setIsEditingPreview(false);
    stopSpeech();
    clearAttachedImage();
  }, [clearAttachedImage, onSheetOpenChange, stopSpeech]);

  const discardInterpret = useCallback(() => {
    clearQuickLog();
    setDraftMessage('');
    setCommitError(null);
    setIsEditingPreview(false);
    stopSpeech();
    clearAttachedImage();
  }, [clearAttachedImage, clearQuickLog, stopSpeech]);

  const stopSpeechListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setSpeechListening(false);
  }, []);

  const startSpeechListening = useCallback(() => {
    const Ctor = pickSpeechRecoCtor();
    if (!Ctor) return;
    stopSpeechListening();
    const r = new Ctor();
    recRef.current = r;
    r.lang = 'zh-TW';
    r.continuous = false;
    r.interimResults = false;
    r.addEventListener('result', (ev: Event) => {
      const line = transcriptFromResultEvent(ev);
      if (!line) return;
      updateMessage(message ? `${message} ${line}` : line);
    });
    r.addEventListener(
      'error',
      () => {
        setSpeechListening(false);
        recRef.current = null;
      },
      false,
    );
    r.addEventListener('end', () => {
      setSpeechListening(false);
      recRef.current = null;
    });
    try {
      r.start();
      setSpeechListening(true);
    } catch {
      setSpeechListening(false);
      recRef.current = null;
    }
  }, [message, stopSpeechListening, updateMessage]);

  const toggleSpeech = useCallback(() => {
    if (speechListening) stopSpeechListening();
    else startSpeechListening();
  }, [speechListening, startSpeechListening, stopSpeechListening]);

  const onInterpret = useCallback(async () => {
    const m = message.trim();
    if (!m && !imagePayload) return;
    setCommitError(null);
    await interpret({
      message: m,
      referenceDateIso: todayIsoDate,
      waterMlKnownToday,
      ...(imagePayload ?
        {
          imageBase64: imagePayload.imageBase64,
          imageMediaType: imagePayload.imageMediaType,
        }
      : {}),
    });
  }, [
    imagePayload,
    interpret,
    message,
    todayIsoDate,
    waterMlKnownToday,
  ]);

  const onCommit = useCallback(async () => {
    if (!result?.entries.length) return;
    setCommitBusy(true);
    setCommitError(null);
    const out = await commitQuickLogEntries(result.entries);
    setCommitBusy(false);
    if (out.ok) {
      clearQuickLog();
      setDraftMessage('');
      clearAttachedImage();
      handleClose();
      router.refresh();
      return;
    }
    setCommitError(
      `第 ${out.index + 1} 筆寫入失敗：${out.message}（先前已成功寫入的項目仍保留，請至「每日紀錄」確認並手動調整未完成項目。）`,
    );
  }, [
    clearAttachedImage,
    clearQuickLog,
    handleClose,
    result?.entries,
    router,
  ]);

  const headerButton = (
    <button
      type="button"
      aria-label="AI 精靈快速紀錄"
      className={cn(HEADER_ACTION_ICON_CLASS, 'text-primary')}
      onClick={() => onSheetOpenChange(true)}>
      <Sparkles className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );

  return (
    <>
      {headerButton}

      <BottomSheetShell open={sheetOpen} title="AI 精靈" onClose={handleClose}>
        <p className="mb-3 text-caption text-muted-foreground">
          用一句話或餐點照片描述飲食、運動或體重／飲水／睡眠，解析後預覽再確認寫入。
        </p>

        <DashboardAiSpriteInput
          message={message}
          onMessageChange={updateMessage}
          disabled={inputsDisabled}
          previewUrl={previewUrl}
          onPreviewUrlChange={setPreviewUrl}
          imagePayload={imagePayload}
          onImagePayloadChange={setImagePayload}
          imageProcessing={imageProcessing}
          onImageProcessingChange={setImageProcessing}
          imageError={imageError}
          onImageErrorChange={setImageError}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {speechSupported ? (
            <Button
              type="button"
              variant={speechListening ? 'default' : 'outline'}
              size="sm"
              disabled={inputsDisabled}
              onClick={toggleSpeech}
              aria-pressed={speechListening}
              className="gap-1.5">
              {speechListening ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  收音中…
                </>
              ) : (
                <>
                  <Mic className="h-[14px] w-[14px]" aria-hidden />
                  語音
                </>
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={inputsDisabled || !canInterpret}
            onClick={() => void onInterpret()}>
            {interpretBusy ?
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                解析中
              </>
            : '解析'}
          </Button>
          {interpretBusy ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={commitBusy}
              onClick={discardInterpret}>
              取消
            </Button>
          ) : null}
        </div>

        {error && !result?.entries.length && !hasEmptyInterpretResult ?
          <div className="mt-3 space-y-2">
            <p className="text-caption text-[#E24B4A]" role="alert">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={discardInterpret}>
              清除
            </Button>
          </div>
        : null}

        {hasEmptyInterpretResult ?
          <div
            className="mt-3 space-y-2 rounded-xl border-hairline border-[#B5D4F4] bg-[#E6F1FB] p-3.5"
            role="status">
            <p className="text-body font-medium text-foreground">
              {QUICK_LOG_UNRECOGNIZABLE_TITLE}
            </p>
            {showEmptyAiSummary ?
              <p className="text-body text-foreground">{emptySummaryZh}</p>
            : null}
            <p className="text-caption text-muted-foreground">
              {QUICK_LOG_UNRECOGNIZABLE_HINT}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={discardInterpret}>
              清除
            </Button>
          </div>
        : null}

        {result?.entries.length ?
          <DashboardAiSpritePreview
            result={result}
            referenceDateIso={todayIsoDate}
            waterMlKnownToday={waterMlKnownToday}
            commitBusy={commitBusy}
            interpretBusy={interpretBusy}
            isReady={isReady}
            reviseError={error}
            commitError={commitError}
            onCommit={() => void onCommit()}
            onDiscard={discardInterpret}
            onRevise={revise}
            onEditingChange={setIsEditingPreview}
          />
        : null}
      </BottomSheetShell>
    </>
  );
}
