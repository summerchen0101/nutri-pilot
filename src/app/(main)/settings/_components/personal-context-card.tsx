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
import type { PersonalContextFacets } from "@/lib/personal-context/types";
import { cn } from "@/lib/utils/cn";

interface PersonalContextCardProps {
  initialFacets: PersonalContextFacets | null;
}

export function PersonalContextCard({
  initialFacets,
}: PersonalContextCardProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState<PersonalContextFacets | null>(null);
  const [saved, setSaved] = useState<PersonalContextFacets | null>(
    initialFacets,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draftEditorOpen, setDraftEditorOpen] = useState(false);

  useEffect(() => {
    setSaved(initialFacets);
  }, [initialFacets]);

  function runAnalyze() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/ai/personal-context/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      const data = (await res.json()) as {
        error?: string;
        facets?: PersonalContextFacets;
      };
      if (!res.ok) {
        setError(data.error ?? "整理失敗");
        return;
      }
      if (!data.facets) {
        setError("回傳資料異常");
        return;
      }
      setPreview(data.facets);
    });
  }

  function runConfirm() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/ai/personal-context/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facets: preview }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "儲存失敗");
        return;
      }
      setSaved(preview);
      setPreview(null);
      setDraft("");
      setDraftEditorOpen(false);
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
      const res = await fetch("/api/ai/personal-context/clear", {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "清除失敗");
        return;
      }
      setSaved(null);
      setPreview(null);
      setDraft("");
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
        onChange={(e) => setDraft(e.target.value)}
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
          {pending ? "整理中…" : "整理成重點"}
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
          onPreviewChange={setPreview}
        />
      ) : null}

      {error ? (
        <p className="mt-2 text-caption text-destructive">{error}</p>
      ) : null}
    </SectionCard>
  );
}
