'use client';

import { Loader2, Mic, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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
import { Button } from '@/components/ui/button';
import { useDashboardAiSprite } from '@/hooks/use-dashboard-ai-sprite';
import { activityTypeLabelZh } from '@/lib/activity/activity-type-labels';
import type { QuickLogValidatedEntry } from '@/lib/quick-log/types';
import { cn } from '@/lib/utils/cn';

const MEAL_LABEL_ZH: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

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
}: {
  todayIsoDate: string;
  waterMlKnownToday?: number | null;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [speechListening, setSpeechListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const { busy: interpretBusy, error, result, interpret, reset } =
    useDashboardAiSprite();

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

  const resetAll = useCallback(() => {
    setMessage('');
    setCommitError(null);
    reset();
    setSpeechListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, [reset]);

  const handleClose = useCallback(() => {
    setSheetOpen(false);
    resetAll();
  }, [resetAll]);

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
      setMessage((prev) => (prev ? `${prev} ${line}` : line));
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
  }, [stopSpeechListening]);

  const toggleSpeech = useCallback(() => {
    if (speechListening) stopSpeechListening();
    else startSpeechListening();
  }, [speechListening, startSpeechListening, stopSpeechListening]);

  const onInterpret = useCallback(async () => {
    const m = message.trim();
    if (!m) return;
    setCommitError(null);
    await interpret({
      message: m,
      referenceDateIso: todayIsoDate,
      waterMlKnownToday,
    });
  }, [interpret, message, todayIsoDate, waterMlKnownToday]);

  const onCommit = useCallback(async () => {
    if (!result?.entries.length) return;
    setCommitBusy(true);
    setCommitError(null);
    const out = await commitQuickLogEntries(result.entries);
    setCommitBusy(false);
    if (out.ok) {
      handleClose();
      router.refresh();
      return;
    }
    setCommitError(
      `第 ${out.index + 1} 筆寫入失敗：${out.message}（先前已成功寫入的項目仍保留，請至「每日紀錄」確認並手動調整未完成項目。）`,
    );
  }, [handleClose, result?.entries, router]);

  const headerButton = (
    <button
      type="button"
      aria-label="AI 精靈快速紀錄"
      className={cn(HEADER_ACTION_ICON_CLASS, 'text-primary')}
      onClick={() => {
        resetAll();
        setSheetOpen(true);
      }}>
      <Sparkles className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );

  return (
    <>
      {headerButton}

      <BottomSheetShell open={sheetOpen} title="AI 精靈" onClose={handleClose}>
        <p className="mb-3 text-caption text-muted-foreground">
          用一句話描述飲食、運動或體重／飲水／睡眠，解析後預覽再確認寫入。
        </p>

        <div className="space-y-2">
          <label htmlFor="ai-sprite-input" className="sr-only">
            快速紀錄內容
          </label>
          <textarea
            id="ai-sprite-input"
            rows={4}
            value={message}
            onChange={(ev) => setMessage(ev.target.value)}
            disabled={interpretBusy || commitBusy}
            placeholder="例：午餐吃了雞腿便當；跑步 40 分鐘"
            className="w-full resize-none rounded-[10px] border-hairline border-[#378ADD]/50 bg-[#F5FAFF] p-3 text-body leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {speechSupported ? (
            <Button
              type="button"
              variant={speechListening ? 'default' : 'outline'}
              size="sm"
              disabled={interpretBusy || commitBusy}
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
            disabled={interpretBusy || commitBusy || !message.trim()}
            onClick={() => void onInterpret()}>
            {interpretBusy ?
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                解析中
              </>
            : '解析'}
          </Button>
        </div>

        {error ? (
          <p className="mt-3 text-caption text-[#E24B4A]" role="alert">
            {error}
          </p>
        ) : null}

        {result?.entries.length ?
          <section className="mt-4 space-y-2 rounded-xl border-hairline border-[#B5D4F4] bg-[#E6F1FB] p-3.5">
            {result.summaryZh ?
              <p className="text-body text-[#2D6B4A]">{result.summaryZh}</p>
            : null}
            <p className="text-heading-card text-foreground">
              預覽（共 {result.entries.length} 筆）
            </p>
            <ul className="space-y-2">
              {result.entries.map((e, idx) => (
                <li
                  key={`${e.kind}-${idx}-${formatEntryPreview(e).slice(0, 12)}`}
                  className="flex gap-2 text-body text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{formatEntryPreview(e)}</span>
                </li>
              ))}
            </ul>
            {commitError ?
              <p className="text-caption text-[#E24B4A]" role="alert">
                {commitError}
              </p>
            : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="default"
                disabled={commitBusy}
                onClick={() => void onCommit()}>
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
                disabled={commitBusy || interpretBusy}
                onClick={() => {
                  setCommitError(null);
                  reset();
                }}>
                重選解析
              </Button>
            </div>
          </section>
        : null}
      </BottomSheetShell>
    </>
  );
}
