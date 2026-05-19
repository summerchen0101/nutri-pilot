import { createClient } from '@/lib/supabase/client';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 120;

export type AnalysisJobTable = 'photo_analysis_jobs' | 'label_guard_jobs';

export type AnalysisJobRow = {
  status?: string;
  result_json?: unknown;
  error_message?: string | null;
};

export function isTerminalJobStatus(status: string): boolean {
  return status === 'ready' || status === 'error';
}

export function watchAnalysisJob(params: {
  table: AnalysisJobTable;
  jobId: string;
  channelPrefix: string;
  onRow: (row: AnalysisJobRow) => void;
  onTimeout: () => void;
}): () => void {
  const supabase = createClient();
  let cancelled = false;
  let attempts = 0;
  let intervalId: number | undefined;

  const channel = supabase
    .channel(`${params.channelPrefix}-${params.jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: params.table,
        filter: `id=eq.${params.jobId}`,
      },
      (payload) => {
        params.onRow(payload.new as AnalysisJobRow);
      },
    )
    .subscribe();

  async function pollOnce(): Promise<boolean> {
    const { data: row } = await supabase
      .from(params.table)
      .select('status,result_json,error_message')
      .eq('id', params.jobId)
      .maybeSingle();

    if (cancelled || !row) return false;

    const st = row.status ?? '';
    params.onRow(row as AnalysisJobRow);
    return isTerminalJobStatus(st);
  }

  function stopPolling() {
    if (intervalId !== undefined) {
      window.clearInterval(intervalId);
      intervalId = undefined;
    }
  }

  intervalId = window.setInterval(() => {
    void (async () => {
      attempts += 1;
      const done = await pollOnce();
      if (done || attempts >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        if (!done && attempts >= MAX_POLL_ATTEMPTS && !cancelled) {
          params.onTimeout();
        }
      }
    })();
  }, POLL_INTERVAL_MS);

  void pollOnce().then((done) => {
    if (done) stopPolling();
  });

  return () => {
    cancelled = true;
    stopPolling();
    void supabase.removeChannel(channel);
  };
}
