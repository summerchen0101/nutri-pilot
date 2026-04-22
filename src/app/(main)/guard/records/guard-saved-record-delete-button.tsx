"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type GuardSavedRecordDeleteButtonProps = {
  recordId: string;
  className?: string;
};

export function GuardSavedRecordDeleteButton({
  recordId,
  className,
}: GuardSavedRecordDeleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    if (!window.confirm("確定要刪除此筆紀錄？")) return;

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("label_guard_saved_reports")
      .delete()
      .eq("id", recordId);

    setPending(false);
    if (error) {
      window.alert(`刪除失敗：${error.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      aria-label="刪除紀錄"
      disabled={pending}
      onClick={onDelete}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-destructive transition-colors",
        "hover:bg-destructive/10 hover:text-destructive",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}>
      <FiTrash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
    </button>
  );
}
