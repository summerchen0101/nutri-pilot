'use client';

import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SectionHeading } from '@/components/ui/section-heading';

type Props = {
  baseBullets: string[];
  fetchAi: boolean;
  todayKcal: number;
  targetKcal: number | null;
  carbG: number;
  proteinG: number;
  fatG: number;
};

export function DashboardInsightSection({
  baseBullets,
  fetchAi,
  todayKcal,
  targetKcal,
  carbG,
  proteinG,
  fatG,
}: Props) {
  const [extra, setExtra] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!fetchAi) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const res = await fetch('/api/ai/dashboard-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            todayKcal,
            targetKcal,
            carbG,
            proteinG,
            fatG,
          }),
        });
        const data = (await res.json()) as { error?: string; bullets?: string[] };
        if (!res.ok) {
          if (!cancelled) setErr(data.error ?? '載入失敗');
          return;
        }
        if (!cancelled) setExtra(Array.isArray(data.bullets) ? data.bullets : []);
      } catch {
        if (!cancelled) setErr('載入失敗');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAi, todayKcal, targetKcal, carbG, proteinG, fatG]);

  const merged = [...baseBullets, ...extra].slice(0, 4);

  return (
    <section className="rounded-xl bg-primary-light p-4">
      <SectionHeading icon={Lightbulb} tone="primary">
        今日建議
      </SectionHeading>
      {fetchAi && loading ? (
        <p className="mt-3 text-caption text-primary-foreground">載入個人化建議中…</p>
      ) : null}
      {err && fetchAi ? (
        <p className="mt-3 text-caption text-destructive">{err}</p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {merged.map((text, idx) => (
          <li key={`${idx}-${text.slice(0, 12)}`} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="text-[13px] leading-relaxed text-primary-foreground">
              {text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
