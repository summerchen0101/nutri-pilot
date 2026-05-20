'use client';

import { useCallback } from 'react';

import type { ClaudeImageMediaType } from '@/lib/ai/image-file-to-claude-payload';
import { usePendingAnalysisJobsStore } from '@/lib/ai/pending-analysis-jobs-store';
import type { QuickLogValidatedEntry } from '@/lib/quick-log/types';

export function useDashboardAiSprite() {
  const quickLog = usePendingAnalysisJobsStore((s) => s.quickLog);
  const startQuickLogInterpret = usePendingAnalysisJobsStore(
    (s) => s.startQuickLogInterpret,
  );
  const startQuickLogRevise = usePendingAnalysisJobsStore(
    (s) => s.startQuickLogRevise,
  );
  const clearQuickLog = usePendingAnalysisJobsStore((s) => s.clearQuickLog);

  const busy = quickLog?.status === 'pending';
  const error = quickLog?.status === 'error' ? (quickLog.error ?? null) : null;
  const result = quickLog?.result ?? null;
  const isReady = quickLog?.status === 'ready';

  const interpret = useCallback(
    async (opts: {
      message: string;
      referenceDateIso: string;
      waterMlKnownToday?: number | null;
      imageBase64?: string;
      imageMediaType?: ClaudeImageMediaType;
    }) => {
      startQuickLogInterpret(opts);
    },
    [startQuickLogInterpret],
  );

  const revise = useCallback(
    (opts: {
      revisionInstruction: string;
      referenceDateIso: string;
      currentEntries: QuickLogValidatedEntry[];
      waterMlKnownToday?: number | null;
    }) => {
      startQuickLogRevise(opts);
    },
    [startQuickLogRevise],
  );

  const reset = useCallback(() => {
    clearQuickLog();
  }, [clearQuickLog]);

  return { busy, error, result, isReady, interpret, revise, reset };
}
