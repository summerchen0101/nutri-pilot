'use client';

import { useCallback, useState } from 'react';

import type { QuickLogValidatedEntry } from '@/lib/quick-log/types';

type InterpretOk = {
  summaryZh: string | null;
  entries: QuickLogValidatedEntry[];
};

export function useDashboardAiSprite() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InterpretOk | null>(null);

  const interpret = useCallback(
    async (opts: {
      message: string;
      referenceDateIso: string;
      waterMlKnownToday?: number | null;
    }) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/ai/quick-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: opts.message,
            referenceDateIso: opts.referenceDateIso,
            ...(opts.waterMlKnownToday != null ?
              { waterMlKnownToday: opts.waterMlKnownToday }
            : {}),
          }),
        });

        const dataUnknown: unknown = await res.json().catch(() => null);
        const data =
          dataUnknown && typeof dataUnknown === 'object' ?
            (dataUnknown as Record<string, unknown>)
          : {};

        if (!res.ok) {
          const msg =
            typeof data.error === 'string' ?
              data.error
            : '解析失敗，請稍後再試';
          setError(msg);
          setResult(null);
          return;
        }

        const summaryRaw = data.summaryZh;
        const summaryZh =
          typeof summaryRaw === 'string' && summaryRaw.trim() ?
            summaryRaw.trim().slice(0, 500)
          : null;

        const entries = data.entries;
        if (!Array.isArray(entries)) {
          setError('回傳格式異常');
          setResult(null);
          return;
        }

        setResult({
          summaryZh,
          entries: entries as QuickLogValidatedEntry[],
        });
      } catch {
        setError('網路錯誤，請稍後再試');
        setResult(null);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { busy, error, result, interpret, reset };
}
