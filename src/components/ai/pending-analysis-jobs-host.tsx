'use client';

import { usePendingAnalysisJobsWatcher } from '@/hooks/use-pending-analysis-jobs-watcher';

/** 掛在 MainAppShell，維持記錄／守衛 AI job 的 poll 與 Realtime（跨頁面）。 */
export function PendingAnalysisJobsHost() {
  usePendingAnalysisJobsWatcher();
  return null;
}
