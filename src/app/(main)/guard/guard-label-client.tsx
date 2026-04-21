'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCamera } from 'react-icons/fi';

import { compressImageForUpload } from '@/lib/food/compress-image-for-upload';
import { invokeLabelGuardRequestFromBrowser } from '@/lib/food/invoke-label-guard-request';
import { LabelGuardReportBody } from '@/components/guard/label-guard-report-body';
import { MAX_LABEL_GUARD_SAVED_REPORTS } from '@/lib/food/label-guard-saved';
import { parseLabelGuardReportJson, type LabelGuardReport } from '@/lib/food/label-guard-report';
import { createClient } from '@/lib/supabase/client';
import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import type { Json } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const MAX_SAVED_NAME_LENGTH = 30;

function getTodayYmd(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDefaultSavedName(safetyScore: number): string {
  return `${getTodayYmd()} ${safetyScore}分`;
}

function applyGuardJobUpdate(
  row: {
    status?: string;
    result_json?: Json | null;
    error_message?: string | null;
  },
  setters: {
    setJobStatus: (s: string | null) => void;
    setReport: (v: LabelGuardReport | null) => void;
    setReportError: (s: string | null) => void;
  },
) {
  const st = row.status ?? '';
  setters.setJobStatus(st);
  if (st === 'ready') {
    const parsed = parseLabelGuardReportJson(row.result_json ?? null);
    setters.setReport(parsed);
    setters.setReportError(parsed ? null : '無法解析分析結果');
    return;
  }
  if (st === 'error') {
    setters.setReportError(row.error_message ?? '分析失敗');
    setters.setReport(null);
  }
}

export function GuardLabelClient() {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const [report, setReport] = useState<LabelGuardReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailBody, setDetailBody] = useState('');
  const [saveEditorOpen, setSaveEditorOpen] = useState(false);
  const [savedName, setSavedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const applyUpdate = useCallback(
    (row: {
      status?: string;
      result_json?: Json | null;
      error_message?: string | null;
    }) => {
      applyGuardJobUpdate(row, {
        setJobStatus,
        setReport,
        setReportError,
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!activeJobId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`label-guard-job-${activeJobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'label_guard_jobs',
          filter: `id=eq.${activeJobId}`,
        },
        (payload) => {
          applyUpdate(
            payload.new as {
              status?: string;
              result_json?: Json | null;
              error_message?: string | null;
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeJobId, applyUpdate]);

  useEffect(() => {
    if (!activeJobId) return;

    const supabase = createClient();
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 120;
    const intervalMs = 1500;

    async function pollOnce(): Promise<boolean> {
      const { data: row } = await supabase
        .from('label_guard_jobs')
        .select('status,result_json,error_message')
        .eq('id', activeJobId)
        .maybeSingle();

      if (cancelled || !row) return false;

      const st = row.status ?? '';
      applyUpdate(row);
      return st === 'ready' || st === 'error';
    }

    let iv: number | undefined;

    iv = window.setInterval(() => {
      void (async () => {
        attempts++;
        const done = await pollOnce();
        if (done || attempts >= maxAttempts) {
          if (iv !== undefined) window.clearInterval(iv);
        }
      })();
    }, intervalMs);

    void pollOnce().then((done) => {
      if (done && iv !== undefined) window.clearInterval(iv);
    });

    return () => {
      cancelled = true;
      if (iv !== undefined) window.clearInterval(iv);
    };
  }, [activeJobId, applyUpdate]);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setReportError(null);
    setReport(null);
    setSaveEditorOpen(false);
    setSavedName('');
    setSaveHint(null);
    setSaveError(null);
    setHint(null);
    setJobStatus(null);
    setActiveJobId(null);
    clearPreview();

    const objectUrl = URL.createObjectURL(file);
    previewRef.current = objectUrl;
    setPreviewUrl(objectUrl);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setReportError('未登入');
      return;
    }

    setBusy(true);
    let uploadFile: File;
    try {
      uploadFile = await compressImageForUpload(file);
    } catch (e) {
      setBusy(false);
      setReportError(e instanceof Error ? e.message : '圖片處理失敗');
      return;
    }

    const ext =
      uploadFile.name.split('.').pop()?.toLowerCase() ??
      (uploadFile.type === 'image/png'
        ? 'png'
        : uploadFile.type === 'image/webp'
          ? 'webp'
          : 'jpg');
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
      ? ext === 'jpeg'
        ? 'jpg'
        : ext
      : 'jpg';

    const path = `${user.id}/label/${Date.now()}.${safeExt}`;
    const mime =
      uploadFile.type ||
      (safeExt === 'png'
        ? 'image/png'
        : safeExt === 'webp'
          ? 'image/webp'
          : 'image/jpeg');

    const { error: upErr } = await supabase.storage
      .from('label-guard-photos')
      .upload(path, uploadFile, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      setBusy(false);
      setReportError(upErr.message);
      return;
    }

    const inv = await invokeLabelGuardRequestFromBrowser(path);
    setBusy(false);

    if (inv.error) {
      setReportError(inv.error);
      return;
    }

    if (inv.hint) setHint(inv.hint);
    const jid = inv.jobId ?? null;
    setActiveJobId(jid);
    setJobStatus('pending');

    if (jid) {
      const { data: row } = await supabase
        .from('label_guard_jobs')
        .select('status,result_json,error_message')
        .eq('id', jid)
        .maybeSingle();

      if (row) applyUpdate(row);
    }
  }

  const waiting =
    !!previewUrl &&
    !report &&
    (busy ||
      (!!activeJobId &&
        jobStatus !== null &&
        jobStatus !== 'ready' &&
        jobStatus !== 'error'));

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
      setSaveError('請輸入名稱');
      return;
    }
    if (name.length > MAX_SAVED_NAME_LENGTH) {
      setSaveError(`名稱最多 ${MAX_SAVED_NAME_LENGTH} 字`);
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
      setSaveError('未登入');
      return;
    }

    const { count, error: countErr } = await supabase
      .from('label_guard_saved_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countErr) {
      setSaving(false);
      setSaveError(countErr.message);
      return;
    }

    if ((count ?? 0) >= MAX_LABEL_GUARD_SAVED_REPORTS) {
      setSaving(false);
      setSaveError('最多 5 筆，請先刪除舊紀錄');
      return;
    }

    const { error: insertErr } = await supabase
      .from('label_guard_saved_reports')
      .insert({
        user_id: user.id,
        job_id: activeJobId,
        name,
        report_json: report as unknown as Json,
      });

    setSaving(false);
    if (insertErr) {
      setSaveError(insertErr.message);
      return;
    }

    setSaveEditorOpen(false);
    setSaveHint('已儲存到個人紀錄');
  }

  return (
    <>
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>食品標示智慧分析</CardTitle>
        <CardDescription>
          拍攝成分與營養標示，取得分級警示與族群提示（辨識僅供參考）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-lg border-[0.5px] border-orange-600/40 bg-orange-50 px-3 py-2 text-[11px] leading-snug text-orange-700">
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
            e.target.value = '';
            void onFile(f);
          }}
        />

        {!previewUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-[0.5px] border-dashed border-primary-light bg-primary-light py-8 transition-colors active:bg-secondary">
            <FiCamera className="h-8 w-8 text-primary" aria-hidden />
            <span className="text-[13px] font-medium text-primary">
              拍攝或選擇相片
            </span>
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
          <div className="space-y-2 rounded-xl border-[0.5px] border-border bg-card p-4">
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
              className="w-full border-[0.5px]"
              onClick={() => {
                clearPreview();
                setReport(null);
                setActiveJobId(null);
                setJobStatus(null);
                setReportError(null);
              }}>
              清除並重新拍攝
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full border-[0.5px]"
              onClick={openSaveEditor}>
              儲存到個人紀錄
            </Button>

            {saveEditorOpen ? (
              <div className="space-y-2 rounded-lg border-[0.5px] border-border bg-card p-3">
                <label
                  htmlFor="saved-report-name"
                  className="text-[11px] font-medium text-muted-foreground">
                  紀錄名稱（可修改）
                </label>
                <input
                  id="saved-report-name"
                  type="text"
                  value={savedName}
                  maxLength={MAX_SAVED_NAME_LENGTH}
                  onChange={(e) => setSavedName(e.target.value)}
                  className="w-full rounded-md border-[0.5px] border-border bg-background px-2.5 py-2 text-[13px] text-foreground outline-none ring-primary transition-colors focus:border-primary focus:ring-2"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {savedName.trim().length}/{MAX_SAVED_NAME_LENGTH}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 border-[0.5px] border-border px-3 text-[12px]"
                      onClick={() => setSaveEditorOpen(false)}>
                      取消
                    </Button>
                    <Button
                      type="button"
                      className="h-8 px-3 text-[12px]"
                      onClick={() => void saveToPersonalRecord()}
                      disabled={saving}>
                      {saving ? '儲存中…' : '儲存'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {saveError ? (
              <p className="text-[12px] text-destructive">{saveError}</p>
            ) : null}
            {saveHint ? (
              <p className="text-[12px] text-primary">{saveHint}</p>
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
    </>
  );
}
