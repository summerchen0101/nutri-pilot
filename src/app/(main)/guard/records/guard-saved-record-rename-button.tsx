"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiEdit2 } from "react-icons/fi";

import { BottomSheetShell } from "@/components/ui/bottom-sheet-shell";
import { Input } from "@/components/ui/input";
import { MAX_LABEL_GUARD_SAVED_NAME_LENGTH } from "@/lib/food/label-guard-saved";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type GuardSavedRecordRenameButtonProps = {
  recordId: string;
  initialName: string;
  className?: string;
};

export function GuardSavedRecordRenameButton({
  recordId,
  initialName,
  className,
}: GuardSavedRecordRenameButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSheet(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDraft(initialName);
    setError(null);
    setOpen(true);
  }

  function closeSheet() {
    setOpen(false);
  }

  async function onSave() {
    const name = draft.trim();
    if (!name) {
      setError("請輸入名稱");
      return;
    }
    if (name.length > MAX_LABEL_GUARD_SAVED_NAME_LENGTH) {
      setError(`名稱最多 ${MAX_LABEL_GUARD_SAVED_NAME_LENGTH} 字`);
      return;
    }

    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("label_guard_saved_reports")
      .update({ name })
      .eq("id", recordId);

    setPending(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label="修改紀錄名稱"
        onClick={openSheet}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-foreground transition-colors",
          "hover:bg-muted/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}>
        <FiEdit2 className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>

      <BottomSheetShell open={open} title="修改紀錄名稱" onClose={closeSheet}>
        <div className="space-y-2 pb-3">
          <label
            htmlFor={`rename-saved-report-${recordId}`}
            className="text-[11px] font-medium text-muted-foreground">
            紀錄名稱
          </label>
          <Input
            id={`rename-saved-report-${recordId}`}
            value={draft}
            maxLength={MAX_LABEL_GUARD_SAVED_NAME_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            className="text-[13px]"
            placeholder="輸入紀錄名稱"
          />
          <p className="text-[11px] text-muted-foreground">
            {draft.trim().length}/{MAX_LABEL_GUARD_SAVED_NAME_LENGTH}
          </p>
          {error ? (
            <p className="text-[11px] text-destructive">{error}</p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={pending}
          className="w-full rounded-[10px] bg-shadow-grey py-2 text-[13px] font-medium text-white disabled:opacity-60"
          onClick={() => void onSave()}>
          {pending ? "儲存中…" : "儲存"}
        </button>
      </BottomSheetShell>
    </>
  );
}
