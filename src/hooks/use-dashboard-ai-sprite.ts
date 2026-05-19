'use client';

import { useCallback } from 'react';

import { usePendingAnalysisJobsStore } from '@/lib/ai/pending-analysis-jobs-store';

export function useDashboardAiSprite() {
  const quickLog = usePendingAnalysisJobsStore((s) => s.quickLog);
  const startQuickLogInterpret = usePendingAnalysisJobsStore(
    (s) => s.startQuickLogInterpret,
  );
  const clearQuickLog = usePendingAnalysisJobsStore((s) => s.clearQuickLog);

  const busy = quickLog?.status === 'pending';
  const error = quickLog?.status === 'error' ? (quickLog.error ?? null) : null;
  const result = quickLog?.status === 'ready' ? (quickLog.result ?? null) : null;

  const interpret = useCallback(
    async (opts: {
      message: string;
      referenceDateIso: string;
      waterMlKnownToday?: number | null;
    }) => {
      startQuickLogInterpret(opts);
    },
    [startQuickLogInterpret],
  );

  const reset = useCallback(() => {
    clearQuickLog();
  }, [clearQuickLog]);

  return { busy, error, result, interpret, reset };
}
