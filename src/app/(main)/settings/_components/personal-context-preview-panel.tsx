'use client';

import { useEffect, useState } from 'react';

import {
  PERSONAL_CONTEXT_SECTION_LABELS,
  listForKey,
} from '@/app/(main)/settings/_lib/personal-context-ui';
import { Button } from '@/components/ui/button';
import {
  normalizeFacetsFromUnknown,
  personalContextFacetsHasContent,
} from '@/lib/personal-context/normalize-facets';
import type { PersonalContextFacets } from '@/lib/personal-context/types';
import {
  PERSONAL_CONTEXT_MAX_ITEM_CHARS,
  PERSONAL_CONTEXT_MAX_ITEMS_PER_LIST,
} from '@/lib/personal-context/types';
import { cn } from '@/lib/utils/cn';

type EditFormState = {
  conditions: string;
  family_history: string;
  current_state: string;
  diet_preferences_extra: string;
  medications_supplements: string;
  other: string;
  summary_zh: string;
  overlap_note: string;
};

function linesFromList(items: string[]): string {
  return items.join('\n');
}

function listFromLines(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines
    .slice(0, PERSONAL_CONTEXT_MAX_ITEMS_PER_LIST)
    .map((l) => l.slice(0, PERSONAL_CONTEXT_MAX_ITEM_CHARS));
}

function facetsToForm(f: PersonalContextFacets): EditFormState {
  return {
    conditions: linesFromList(listForKey(f, 'conditions')),
    family_history: linesFromList(listForKey(f, 'family_history')),
    current_state: linesFromList(listForKey(f, 'current_state')),
    diet_preferences_extra: linesFromList(
      listForKey(f, 'diet_preferences_extra'),
    ),
    medications_supplements: linesFromList(
      listForKey(f, 'medications_supplements'),
    ),
    other: linesFromList(listForKey(f, 'other')),
    summary_zh: f.summary_zh ?? '',
    overlap_note: f.overlap_note ?? '',
  };
}

function formToFacetPayload(
  form: EditFormState,
  extractedAt: string,
): PersonalContextFacets | null {
  return normalizeFacetsFromUnknown(
    {
      conditions: listFromLines(form.conditions),
      family_history: listFromLines(form.family_history),
      current_state: listFromLines(form.current_state),
      diet_preferences_extra: listFromLines(form.diet_preferences_extra),
      medications_supplements: listFromLines(form.medications_supplements),
      other: listFromLines(form.other),
      summary_zh: form.summary_zh.trim() || null,
      overlap_note: form.overlap_note.trim() || null,
    },
    extractedAt,
  );
}

const textControlClass = cn(
  'w-full resize-y rounded-[10px] border-hairline border-border bg-background px-3 py-2 text-body',
  'outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15',
);

export interface PersonalContextPreviewPanelProps {
  preview: PersonalContextFacets;
  pending: boolean;
  onConfirm: () => void;
  onCancelPreview: () => void;
  onPreviewChange: (next: PersonalContextFacets) => void;
}

export function PersonalContextPreviewPanel({
  preview,
  pending,
  onConfirm,
  onCancelPreview,
  onPreviewChange,
}: PersonalContextPreviewPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(() =>
    facetsToForm(preview),
  );
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setEditMode(false);
    setEditForm(facetsToForm(preview));
    setEditError(null);
  }, [preview]);

  function openEdit() {
    setEditError(null);
    setEditForm(facetsToForm(preview));
    setEditMode(true);
  }

  function completeEdit() {
    setEditError(null);
    const next = formToFacetPayload(editForm, preview.extracted_at);
    if (!next || !personalContextFacetsHasContent(next)) {
      setEditError('至少保留一則重點或摘要，再完成編輯');
      return;
    }
    onPreviewChange(next);
    setEditMode(false);
  }

  function cancelEdit() {
    setEditError(null);
    setEditMode(false);
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border-hairline border-border bg-muted/30 p-3">
      <p className="text-[11px] font-medium text-foreground">預覽（尚未套用）</p>

      {!editMode ? (
        <>
          {preview.summary_zh ? (
            <p className="text-[13px] leading-relaxed text-foreground">
              {preview.summary_zh}
            </p>
          ) : null}
          {PERSONAL_CONTEXT_SECTION_LABELS.map(({ key, label }) => {
            const items = listForKey(preview, key);
            if (!items.length) return null;
            return (
              <div key={key}>
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
          {preview.overlap_note ? (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {preview.overlap_note}
            </p>
          ) : null}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            每個區塊一行一條；空白行會忽略。
          </p>
          <div>
            <label
              htmlFor="pc-summary"
              className="text-caption text-muted-foreground">
              摘要
            </label>
            <textarea
              id="pc-summary"
              value={editForm.summary_zh}
              onChange={(e) =>
                setEditForm((s) => ({ ...s, summary_zh: e.target.value }))
              }
              rows={3}
              className={cn(textControlClass, 'mt-1')}
            />
          </div>
          {PERSONAL_CONTEXT_SECTION_LABELS.map(({ key, label }) => (
            <div key={key}>
              <label
                htmlFor={`pc-${key}`}
                className="text-caption text-muted-foreground">
                {label}
              </label>
              <textarea
                id={`pc-${key}`}
                value={editForm[key]}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, [key]: e.target.value }))
                }
                rows={3}
                className={cn(textControlClass, 'mt-1')}
              />
            </div>
          ))}
          <div>
            <label
              htmlFor="pc-overlap"
              className="text-caption text-muted-foreground">
              與過敏／忌食欄位重疊提醒（選填）
            </label>
            <textarea
              id="pc-overlap"
              value={editForm.overlap_note}
              onChange={(e) =>
                setEditForm((s) => ({ ...s, overlap_note: e.target.value }))
              }
              rows={2}
              className={cn(textControlClass, 'mt-1')}
            />
          </div>
          {editError ? (
            <p className="text-[11px] text-destructive">{editError}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={completeEdit}>
              完成編輯
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={cancelEdit}>
              取消編輯
            </Button>
          </div>
        </div>
      )}

      {!editMode ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={onConfirm}>
            {pending ? '套用中…' : '確認套用'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={openEdit}>
            手動修改
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={onCancelPreview}>
            取消
          </Button>
        </div>
      ) : null}
    </div>
  );
}
