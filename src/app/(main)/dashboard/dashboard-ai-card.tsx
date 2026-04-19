'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils/cn';

export type AiSnapshotPayload = {
  todayKcal: number;
  targetKcal: number | null;
  weightKg: number | null;
  streakDays: number;
  carbG: number;
  proteinG: number;
  fatG: number;
};

export function DashboardAiCard({
  snapshot,
}: {
  snapshot: AiSnapshotPayload;
}) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/ai/dashboard-suggestion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot),
        });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? '無法載入建議');
        }
        if (!cancelled) setText(data.text ?? '');
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : '載入失敗');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot, refreshKey]);

  return (
    <section
      className="rounded-xl border-[0.5px] border-[#4C956C]/30 bg-[#E8F5EE] p-3.5"
      aria-busy={loading}
    >
      <p className="text-[11px] font-medium text-[#2D6B4A]">AI 建議</p>
      {loading ? (
        <div className="mt-2 space-y-2">
          <div className="h-3.5 w-full animate-pulse rounded bg-[#4C956C]/15" />
          <div className="h-3.5 w-[92%] animate-pulse rounded bg-[#4C956C]/15" />
          <div className="h-3.5 w-[70%] animate-pulse rounded bg-[#4C956C]/15" />
        </div>
      ) : err ? (
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {err}
        </p>
      ) : (
        <p className="mt-2 text-[13px] leading-[1.7] text-foreground">
          {text}
        </p>
      )}
      <div className="mt-3">
        <button
          type="button"
          disabled={loading}
          className={cn(
            'rounded-lg border-[1.5px] border-[#4C956C] px-3 py-1.5 text-[11px] font-medium text-[#4C956C]',
            'transition-colors duration-150 hover:bg-[#E8F5EE]/90 disabled:opacity-50',
          )}
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          換一則建議
        </button>
      </div>
    </section>
  );
}
