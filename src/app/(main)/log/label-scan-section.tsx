'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCamera } from 'react-icons/fi';

import { compressImageForUpload } from '@/lib/food/compress-image-for-upload';
import { invokeAiPhotoRequestFromBrowser } from '@/lib/food/invoke-photo-request';
import {
  parseLabelAnalysisJson,
  type LabelAnalysisResult,
} from '@/lib/food/label-analysis-result';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

function applyLabelJobUpdate(
  row: {
    status?: string;
    result_json?: Json | null;
    error_message?: string | null;
  },
  setters: {
    setJobStatus: (s: string | null) => void;
    setLabelResult: (v: LabelAnalysisResult | null) => void;
    setLabelError: (s: string | null) => void;
  },
) {
  const st = row.status ?? '';
  setters.setJobStatus(st);
  if (st === 'ready') {
    const parsed = parseLabelAnalysisJson(row.result_json ?? null);
    setters.setLabelResult(parsed);
    setters.setLabelError(parsed ? null : '無法解析標籤結果');
    return;
  }
  if (st === 'error') {
    setters.setLabelError(row.error_message ?? '分析失敗');
    setters.setLabelResult(null);
  }
}

export function LabelScanSection() {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const [labelResult, setLabelResult] = useState<LabelAnalysisResult | null>(
    null,
  );
  const [labelError, setLabelError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyUpdate = useCallback(
    (row: {
      status?: string;
      result_json?: Json | null;
      error_message?: string | null;
    }) => {
      applyLabelJobUpdate(row, {
        setJobStatus,
        setLabelResult,
        setLabelError,
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
      .channel(`label-job-${activeJobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'photo_analysis_jobs',
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
        .from('photo_analysis_jobs')
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
    setLabelError(null);
    setLabelResult(null);
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
      setLabelError('未登入');
      return;
    }

    setBusy(true);
    let uploadFile: File;
    try {
      uploadFile = await compressImageForUpload(file);
    } catch (e) {
      setBusy(false);
      setLabelError(e instanceof Error ? e.message : '圖片處理失敗');
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
      .from('food-photos')
      .upload(path, uploadFile, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      setBusy(false);
      setLabelError(upErr.message);
      return;
    }

    const inv = await invokeAiPhotoRequestFromBrowser(path, 'label');
    setBusy(false);

    if (inv.error) {
      setLabelError(inv.error);
      return;
    }

    if (inv.hint) setHint(inv.hint);
    const jid = inv.jobId ?? null;
    setActiveJobId(jid);
    setJobStatus('pending');

    if (jid) {
      const { data: row } = await supabase
        .from('photo_analysis_jobs')
        .select('status,result_json,error_message')
        .eq('id', jid)
        .maybeSingle();

      if (row) applyUpdate(row);
    }
  }

  const waiting =
    !!previewUrl &&
    !labelResult &&
    (busy ||
      (!!activeJobId &&
        jobStatus !== null &&
        jobStatus !== 'ready' &&
        jobStatus !== 'error'));

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>拍營養標／成分</CardTitle>
        <CardDescription>
          拍攝包裝上的成分與營養標示，取得添加物與族群風險提示（辨識僅供參考）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-lg border-[0.5px] border-amber-600/40 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
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
            className="flex w-full flex-col items-center gap-2 rounded-xl border-[0.5px] border-dashed border-primary-light bg-primary-light py-8 transition-colors active:bg-secondary"
          >
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
              className="absolute right-2 top-2 rounded-full bg-[#1E212B]/70 px-3 py-1 text-[11px] text-white"
            >
              重新選擇
            </button>
          </div>
        )}

        {busy ? (
          <p className="text-[13px] text-muted-foreground">上傳並排入分析…</p>
        ) : null}
        {hint ? (
          <p className="text-[11px] text-amber-600">{hint}</p>
        ) : null}

        {waiting ? (
          <div className="space-y-2 rounded-xl border-[0.5px] border-border bg-card p-4">
            <div className="animate-pulse h-4 w-1/3 rounded-full bg-muted" />
            <p className="text-center text-[11px] text-muted-foreground">
              AI 分析標示中…
            </p>
          </div>
        ) : null}

        {labelError ? (
          <p className="text-[13px] text-destructive">{labelError}</p>
        ) : null}

        {labelResult ? (
          <div className="space-y-3 rounded-xl border-[0.5px] border-border bg-secondary p-4">
            <p className="text-[11px] font-medium text-muted-foreground">
              免責：以下為影像辨識與一般性建議，請勿作為醫療或過敏唯一依據。
            </p>
            {labelResult.product_name_guess ? (
              <p className="text-[15px] font-medium text-foreground">
                {labelResult.product_name_guess}
              </p>
            ) : null}

            {labelResult.age_advisory_text ? (
              <p className="text-[13px] text-foreground">
                <span className="font-medium">年齡標示：</span>
                {labelResult.age_advisory_text}
              </p>
            ) : null}

            {labelResult.allergen_match.match ? (
              <p className="rounded-md border-[0.5px] border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[13px] text-destructive">
                可能與您自述過敏原相關：
                {labelResult.allergen_match.detail ?? '請留意成分表'}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-1.5">
              {labelResult.audience_flags.not_suitable_infant ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  嬰幼兒須留意
                </span>
              ) : null}
              {labelResult.audience_flags.child_caution ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  兒童留意
                </span>
              ) : null}
              {labelResult.audience_flags.elderly_caution ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  長者留意
                </span>
              ) : null}
              {labelResult.audience_flags.high_sugar_concern ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  糖／熱量留意
                </span>
              ) : null}
            </div>

            {labelResult.additives.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  添加物／成分留意
                </p>
                <ul className="mt-2 space-y-2">
                  {labelResult.additives.map((a, i) => (
                    <li
                      key={`${a.name}-${i}`}
                      className="rounded-lg border-[0.5px] border-border bg-card px-2.5 py-2 text-[13px]"
                    >
                      <span className="font-medium text-foreground">
                        {a.name}
                      </span>
                      {a.code ? (
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          ({a.code})
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'ml-2 rounded px-1 text-[10px]',
                          a.concern_level === 'high' && 'bg-destructive/15 text-destructive',
                          a.concern_level === 'medium' && 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
                          a.concern_level === 'low' && 'bg-muted text-muted-foreground',
                        )}
                      >
                        {a.concern_level === 'high'
                          ? '高'
                          : a.concern_level === 'medium'
                            ? '中'
                            : '低'}
                      </span>
                      {a.note ? (
                        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                          {a.note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {labelResult.summary_bullets.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-foreground">
                {labelResult.summary_bullets.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="w-full border-[0.5px]"
              onClick={() => {
                clearPreview();
                setLabelResult(null);
                setActiveJobId(null);
                setJobStatus(null);
                setLabelError(null);
              }}
            >
              清除並重新拍攝
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
