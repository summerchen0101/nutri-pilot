'use client';

import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { PersonalContextPreviewPanel } from '@/app/(main)/settings/_components/personal-context-preview-panel';
import {
  PERSONAL_CONTEXT_SECTION_LABELS,
  listForKey,
} from '@/app/(main)/settings/_lib/personal-context-ui';
import { SectionCard } from '@/components/ui/section-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { Button } from '@/components/ui/button';
import type { PersonalContextFacets } from '@/lib/personal-context/types';
import { cn } from '@/lib/utils/cn';

interface PersonalContextCardProps {
  initialFacets: PersonalContextFacets | null;
}

export function PersonalContextCard({
  initialFacets,
}: PersonalContextCardProps) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState<PersonalContextFacets | null>(null);
  const [saved, setSaved] = useState<PersonalContextFacets | null>(
    initialFacets,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(initialFacets);
  }, [initialFacets]);

  function runAnalyze() {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/ai/personal-context/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft }),
      });
      const data = (await res.json()) as {
        error?: string;
        facets?: PersonalContextFacets;
      };
      if (!res.ok) {
        setError(data.error ?? '整理失敗');
        return;
      }
      if (!data.facets) {
        setError('回傳資料異常');
        return;
      }
      setPreview(data.facets);
    });
  }

  function runConfirm() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/ai/personal-context/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facets: preview }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '儲存失敗');
        return;
      }
      setSaved(preview);
      setPreview(null);
      setDraft('');
      router.refresh();
    });
  }

  function runCancelPreview() {
    setPreview(null);
    setError(null);
  }

  function runClear() {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/ai/personal-context/clear', {
        method: 'POST',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '清除失敗');
        return;
      }
      setSaved(null);
      setPreview(null);
      setDraft('');
      router.refresh();
    });
  }

  return (
    <SectionCard>
      <SectionHeading icon={FileText} className="mb-1">
        個人化健康／飲食脈絡
      </SectionHeading>
      <p className="text-[11px] leading-snug text-muted-foreground">
        可用口語或條列描述疾病史、家族史、目前狀況、飲食留意等。按下「整理成重點」後會由
        AI 分類（非醫療診斷）；確認無誤再套用，必要時可手動調整內容。資料僅供 App 內建議參考。
      </p>

      {!preview ? (
        <div className="mt-3 space-y-2">
          <label htmlFor="personal-context-draft" className="sr-only">
            個人化描述草稿
          </label>
          <textarea
            id="personal-context-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="例如：家族有糖尿病，醫師建議控制澱粉；目前備孕，較在意葉酸與生食..."
            className={cn(
              'w-full resize-y rounded-[10px] border-hairline border-border bg-background px-3 py-2 text-body',
              'outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15',
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || draft.trim().length < 8}
              onClick={runAnalyze}>
              {pending ? '整理中…' : '整理成重點'}
            </Button>
            {saved != null ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={runClear}>
                清除已儲存重點
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <PersonalContextPreviewPanel
          preview={preview}
          pending={pending}
          onConfirm={runConfirm}
          onCancelPreview={runCancelPreview}
          onPreviewChange={setPreview}
        />
      )}

      {!preview && saved ? (
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            目前已套用
          </p>
          {saved.summary_zh ? (
            <p className="text-[13px] leading-relaxed text-foreground">
              {saved.summary_zh}
            </p>
          ) : null}
          {PERSONAL_CONTEXT_SECTION_LABELS.map(({ key, label }) => {
            const items = listForKey(saved, key);
            if (!items.length) return null;
            return (
              <div key={`saved-${key}`}>
                <p className="text-caption font-medium text-muted-foreground">
                  {label}
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-foreground">
                  {items.map((t, idx) => (
                    <li key={`${key}-${idx}-${t.slice(0, 24)}`}>{t}</li>
                  ))}
                </ul>
              </div>
            );
          })}
          {saved.overlap_note ? (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {saved.overlap_note}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-[11px] text-destructive">{error}</p>
      ) : null}
    </SectionCard>
  );
}
