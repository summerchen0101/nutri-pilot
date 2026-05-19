"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { FiCamera } from "react-icons/fi";

import { usePendingAnalysisJobsStore } from "@/lib/ai/pending-analysis-jobs-store";
import { createSignedStoragePreviewUrl } from "@/lib/ai/signed-storage-preview-url";
import { isTerminalJobStatus } from "@/lib/ai/watch-analysis-job";
import { compressImageForUpload } from "@/lib/food/compress-image-for-upload";
import { invokeLabelGuardRequestFromBrowser } from "@/lib/food/invoke-label-guard-request";
import { LabelGuardReportBody } from "@/components/guard/label-guard-report-body";
import {
  MAX_LABEL_GUARD_SAVED_NAME_LENGTH,
  MAX_LABEL_GUARD_SAVED_REPORTS,
} from "@/lib/food/label-guard-saved";
import { createClient } from "@/lib/supabase/client";
import { BottomSheetShell } from "@/components/ui/bottom-sheet-shell";
import type { Json } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

function getTodayYmd(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDefaultSavedName(safetyScore: number): string {
  return `${getTodayYmd()} ${safetyScore}分`;
}

export function GuardLabelClient() {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const guardPending = usePendingAnalysisJobsStore((s) => s.guard);
  const startGuardJob = usePendingAnalysisJobsStore((s) => s.startGuardJob);
  const patchGuardFromRow = usePendingAnalysisJobsStore((s) => s.patchGuardFromRow);
  const clearGuard = usePendingAnalysisJobsStore((s) => s.clearGuard);

  const previewUrl = guardPending?.previewUrl ?? null;
  const report = guardPending?.report ?? null;
  const hint = guardPending?.hint ?? null;
  const reportError = guardPending?.error ?? localError;
  const jobStatus = guardPending?.status ?? null;
  const activeJobId = guardPending?.jobId || null;
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailBody, setDetailBody] = useState("");
  const [saveEditorOpen, setSaveEditorOpen] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!guardPending?.storagePath || guardPending.previewUrl) return;
    let cancelled = false;
    void createSignedStoragePreviewUrl(
      "label-guard-photos",
      guardPending.storagePath,
    ).then((url) => {
      if (cancelled || !url) return;
      usePendingAnalysisJobsStore.getState().setGuardPreviewUrl(url, false);
    });
    return () => {
      cancelled = true;
    };
  }, [guardPending?.storagePath, guardPending?.previewUrl]);

  function resetGuardUi() {
    setLocalError(null);
    clearGuard();
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setSaveEditorOpen(false);
    setSavedName("");
    setSaveHint(null);
    setSaveError(null);
    setLocalError(null);
    clearGuard();

    const objectUrl = URL.createObjectURL(file);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLocalError("未登入");
      return;
    }

    setBusy(true);
    let uploadFile: File;
    try {
      uploadFile = await compressImageForUpload(file);
    } catch (e) {
      setBusy(false);
      setLocalError(e instanceof Error ? e.message : "圖片處理失敗");
      return;
    }

    const ext =
      uploadFile.name.split(".").pop()?.toLowerCase() ??
      (uploadFile.type === "image/png"
        ? "png"
        : uploadFile.type === "image/webp"
          ? "webp"
          : "jpg");
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext)
      ? ext === "jpeg"
        ? "jpg"
        : ext
      : "jpg";

    const path = `${user.id}/label/${Date.now()}.${safeExt}`;
    const mime =
      uploadFile.type ||
      (safeExt === "png"
        ? "image/png"
        : safeExt === "webp"
          ? "image/webp"
          : "image/jpeg");

    const { error: upErr } = await supabase.storage
      .from("label-guard-photos")
      .upload(path, uploadFile, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      setBusy(false);
      setLocalError(upErr.message);
      return;
    }

    const inv = await invokeLabelGuardRequestFromBrowser(path);
    setBusy(false);

    if (inv.error) {
      setLocalError(inv.error);
      return;
    }

    const jid = inv.jobId;
    if (!jid) {
      setLocalError("未回傳 jobId");
      return;
    }

    startGuardJob({
      jobId: jid,
      storagePath: path,
      previewUrl: objectUrl,
      previewIsBlob: true,
      hint: inv.hint ?? null,
      initialStatus: "pending",
    });

    const { data: row } = await supabase
      .from("label_guard_jobs")
      .select("status,result_json,error_message")
      .eq("id", jid)
      .maybeSingle();

    if (row) patchGuardFromRow(row);
  }

  const waiting =
    !!previewUrl &&
    !report &&
    (busy ||
      (!!activeJobId && !!jobStatus && !isTerminalJobStatus(jobStatus)));

  function openDetailSheet(title: string, body: string) {
    setDetailTitle(title);
    setDetailBody(body);
    setDetailOpen(true);
  }

  function openSaveEditor() {
    if (!report) return;
    setSavedName(buildDefaultSavedName(report.safety_score));
    setSaveHint(null);
    setSaveError(null);
    setSaveEditorOpen(true);
  }

  async function saveToPersonalRecord() {
    if (!report) return;
    const name = savedName.trim();
    if (!name) {
      setSaveError("請輸入名稱");
      return;
    }
    if (name.length > MAX_LABEL_GUARD_SAVED_NAME_LENGTH) {
      setSaveError(`名稱最多 ${MAX_LABEL_GUARD_SAVED_NAME_LENGTH} 字`);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveHint(null);

    const supabase = createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setSaving(false);
      setSaveError("未登入");
      return;
    }

    const userId = user.id;

    const { count, error: countErr } = await supabase
      .from("label_guard_saved_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    async function insertSavedReport(): Promise<{ error: string | null }> {
      const { error: insertErr } = await supabase
        .from("label_guard_saved_reports")
        .insert({
          user_id: userId,
          job_id: activeJobId || null,
          name,
          report_json: report as unknown as Json,
        });
      return { error: insertErr?.message ?? null };
    }

    if (countErr) {
      setSaving(false);
      setSaveError(countErr.message);
      return;
    }

    if ((count ?? 0) >= MAX_LABEL_GUARD_SAVED_REPORTS) {
      const { data: oldest, error: oldestErr } = await supabase
        .from("label_guard_saved_reports")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (oldestErr) {
        setSaving(false);
        setSaveError(oldestErr.message);
        return;
      }

      if (!oldest) {
        setSaving(false);
        setSaveError("無法取得最舊紀錄");
        return;
      }

      const confirmed = window.confirm(
        `個人紀錄已滿（5/5）。是否覆蓋最舊的紀錄「${oldest.name}」？此動作無法復原。`,
      );

      if (!confirmed) {
        setSaving(false);
        return;
      }

      const { error: deleteErr } = await supabase
        .from("label_guard_saved_reports")
        .delete()
        .eq("id", oldest.id);

      if (deleteErr) {
        setSaving(false);
        setSaveError(deleteErr.message);
        return;
      }
    }

    const { error: insertError } = await insertSavedReport();

    setSaving(false);
    if (insertError) {
      setSaveError(insertError);
      return;
    }

    setSaveEditorOpen(false);
    setSaveHint("已儲存到個人紀錄");
  }

  return (
    <>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <SectionHeading
            icon={ShieldCheck}
            as="h3"
            className="leading-none tracking-tight">
            食品標示與食安分析
          </SectionHeading>
          <CardDescription>
            拍攝成分與營養標示，由食品安全守衛產生分級警示與族群提示（辨識僅供參考）。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-lg border-hairline border-orange-600/40 bg-orange-50 px-3 py-2 text-[11px] leading-snug text-orange-700">
            本服務非醫療診斷；嬰幼兒、慢性病或過敏請以產品標示與醫師建議為準。
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void onFile(f);
            }}
          />

          {!previewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-hairline border-dashed border-primary bg-transparent py-8 text-primary transition-opacity active:opacity-90">
              <FiCamera className="h-8 w-8 shrink-0" aria-hidden />
              <span className="text-[13px] font-medium">拍攝或選擇相片</span>
            </button>
          ) : (
            <div className="relative w-full overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="標籤預覽"
                className="max-h-56 w-full object-contain"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-2 top-2 rounded-full bg-[#1E212B]/70 px-3 py-1 text-[11px] text-white">
                重新選擇
              </button>
            </div>
          )}

          {busy ? (
            <p className="text-[13px] text-muted-foreground">上傳並排入分析…</p>
          ) : null}
          {hint ? <p className="text-[11px] text-amber-600">{hint}</p> : null}

          {waiting ? (
            <div className="space-y-2 rounded-xl bg-card p-4">
              <div className="animate-pulse h-4 w-1/3 rounded-full bg-muted" />
              <p className="text-center text-[11px] text-muted-foreground">
                AI 分析標示中…
              </p>
            </div>
          ) : null}

          {reportError ? (
            <p className="text-[13px] text-destructive">{reportError}</p>
          ) : null}

          {report ? (
            <>
              <LabelGuardReportBody
                report={report}
                onOpenDetail={(title, body) => openDetailSheet(title, body)}
              />

              <Button
                type="button"
                variant="outline"
                className="w-full border-hairline"
                onClick={() => {
                  resetGuardUi();
                }}>
                清除並重新拍攝
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full border-hairline"
                onClick={openSaveEditor}>
                儲存到個人紀錄
              </Button>

              {saveError && !saveEditorOpen ? (
                <p className="text-caption text-destructive">{saveError}</p>
              ) : null}
              {saveHint ? (
                <p className="text-caption text-primary">{saveHint}</p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <BottomSheetShell
        open={detailOpen}
        title={detailTitle}
        onClose={() => setDetailOpen(false)}>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
          {detailBody}
        </p>
      </BottomSheetShell>

      <BottomSheetShell
        open={saveEditorOpen}
        title="儲存到個人紀錄"
        onClose={() => setSaveEditorOpen(false)}>
        <div className="space-y-2 pb-3">
          <label
            htmlFor="saved-report-name"
            className="text-[11px] font-medium text-muted-foreground">
            紀錄名稱（可修改）
          </label>
          <Input
            id="saved-report-name"
            value={savedName}
            maxLength={MAX_LABEL_GUARD_SAVED_NAME_LENGTH}
            onChange={(e) => setSavedName(e.target.value)}
            className="text-[13px]"
            placeholder="輸入紀錄名稱"
          />
          <p className="text-[11px] text-muted-foreground">
            {savedName.trim().length}/{MAX_LABEL_GUARD_SAVED_NAME_LENGTH}
          </p>
          {saveError ? (
            <p className="text-[11px] text-destructive">{saveError}</p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={saving}
          className="flex min-h-11 w-full items-center justify-center rounded-[10px] bg-shadow-grey py-[11px] text-[13px] font-medium text-white disabled:opacity-60"
          onClick={() => void saveToPersonalRecord()}>
          {saving ? "儲存中…" : "儲存"}
        </button>
      </BottomSheetShell>
    </>
  );
}
