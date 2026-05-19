"use client";

import { ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { PersonalContextPreviewPanel } from "@/app/(main)/settings/_components/personal-context-preview-panel";
import {
  PERSONAL_CONTEXT_SECTION_LABELS,
  listForKey,
} from "@/app/(main)/settings/_lib/personal-context-ui";
import { SectionCard } from "@/components/ui/section-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { usePendingAnalysisJobsStore } from "@/lib/ai/pending-analysis-jobs-store";
import type { PersonalContextFacets } from "@/lib/personal-context/types";
import { cn } from "@/lib/utils/cn";

interface PersonalContextCardProps {
  initialFacets: PersonalContextFacets | null;
}

export function PersonalContextCard({
  initialFacets,
}: PersonalContextCardProps) {
  const router = useRouter();
  const [saved, setSaved] = useState<PersonalContextFacets | null>(
    initialFacets,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmPending, startConfirmTransition] = useTransition();
  const [draftEditorOpen, setDraftEditorOpen] = useState(false);

  const personalContext = usePendingAnalysisJobsStore((s) => s.personalContext);
  const startPersonalContextAnalyze = usePendingAnalysisJobsStore(
    (s) => s.startPersonalContextAnalyze,
  );
  const setPersonalContextDraft = usePendingAnalysisJobsStore(
    (s) => s.setPersonalContextDraft,
  );
  const setPersonalContextPreview = usePendingAnalysisJobsStore(
    (s) => s.setPersonalContextPreview,
  );
  const clearPersonalContextTask = usePendingAnalysisJobsStore(
    (s) => s.clearPersonalContextTask,
  );

  const analyzePending = personalContext?.status === "pending";
  const preview = personalContext?.preview ?? null;
  const error = personalContext?.error ?? localError;
  const draft = personalContext?.draft ?? "";

  const pending = analyzePending || confirmPending;

  useEffect(() => {
    setSaved(initialFacets);
  }, [initialFacets]);

  function runAnalyze() {
    setLocalError(null);
    startPersonalContextAnalyze(draft);
  }

  function runConfirm() {
    if (!preview) return;
    setLocalError(null);
    startConfirmTransition(async () => {
      const res = await fetch("/api/ai/personal-context/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facets: preview }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLocalError(data.error ?? "儲存失敗");
        return;
      }
      setSaved(preview);
      clearPersonalContextTask();
      setDraftEditorOpen(false);
      router.refresh();
    });
  }

  function runCancelPreview() {
    clearPersonalContextTask();
    setLocalError(null);
  }

  function runClear() {
    setLocalError(null);
    startConfirmTransition(async () => {
      const res = await fetch("/api/ai/personal-context/clear", {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLocalError(data.error ?? "清除失敗");
        return;
      }
      setSaved(null);
      clearPersonalContextTask();
      setDraftEditorOpen(false);
      router.refresh();
    });
  }

  const draftEditorForm = (
    <div className="space-y-2">
      <label htmlFor="personal-context-draft" className="sr-only">
        個人化描述草稿
      </label>
      <textarea
        id="personal-context-draft"
        value={draft}
        onChange={(e) => setPersonalContextDraft(e.target.value)}
        rows={5}
        placeholder="例如：家族有糖尿病，醫師建議控制澱粉；目前備孕，較在意葉酸與生食..."
        className={cn(
          "w-full resize-y rounded-[10px] border-hairline border-border bg-background px-3 py-2 text-body",
          "outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15",
        )}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || draft.trim().length < 8}
          onClick={runAnalyze}>
          {analyzePending ? "整理中…" : "整理成重點"}
        </Button>
        {analyzePending ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={runCancelPreview}>
            取消
          </Button>
        ) : null}

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className="size-10 shrink-0 p-0"
          aria-label="收起編輯"
          title="收起"
          onClick={() => setDraftEditorOpen(false)}>
          <ChevronUp className="size-[18px]" aria-hidden />
        </Button>
      </div>
    </div>
  );

  const showPulseMainBlock = !preview && (saved != null || draftEditorOpen);

  const showEmptyCta = !preview && saved == null && !draftEditorOpen;

  return (
    <SectionCard>
      <SectionHeading variant="nested" className="mb-1">
        健康脈絡
      </SectionHeading>
      <p className="text-caption leading-snug text-muted-foreground">
        飲食目標方向、是否有家族病史、目前狀況(備孕、懷孕、哺乳等)、飲食留意等；若要留意糖分或血糖議題亦可在此口述說明（仍非醫療建議）。
      </p>

      {showPulseMainBlock ? (
        <div className="mt-4 border-t border-border pt-3">
          {saved != null ? (
            <div className="space-y-2">
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

          {draftEditorOpen ? (
            <div className={saved != null ? "mt-3" : ""}>{draftEditorForm}</div>
          ) : saved != null ? (
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setDraftEditorOpen(true)}>
                重新設定
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showEmptyCta ? (
        <div className="mt-4 border-t border-border pt-3">
          <Button
            type="button"
            size="sm"
            onClick={() => setDraftEditorOpen(true)}>
            設定
          </Button>
        </div>
      ) : null}

      {preview ? (
        <PersonalContextPreviewPanel
          preview={preview}
          pending={pending}
          onConfirm={runConfirm}
          onCancelPreview={runCancelPreview}
          onPreviewChange={setPersonalContextPreview}
        />
      ) : null}

      {error && !preview ?
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-caption text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={runCancelPreview}>
            清除
          </Button>
        </div>
      : null}
    </SectionCard>
  );
}
