'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCamera } from 'react-icons/fi';

import { compressImageForUpload } from '@/lib/food/compress-image-for-upload';
import { invokeLabelGuardRequestFromBrowser } from '@/lib/food/invoke-label-guard-request';
import {
  allergenDetailSheetBody,
  resolveAlertKeywordExplanation,
  resolveRiskItemExplanation,
} from '@/lib/food/label-guard-lookups';
import {
  audienceSegmentLabelZh,
  parseLabelGuardReportJson,
  tierLabelZh,
  TW_ALLERGEN_LABEL_ZH,
  type LabelGuardReport,
  type RiskTier,
} from '@/lib/food/label-guard-report';
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
import { cn } from '@/lib/utils/cn';

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

function tierBadgeClass(tier: RiskTier): string {
  switch (tier) {
    case 'high':
    case 'medium':
    case 'watch':
      return 'bg-[#FFF4E5] text-[#C57A12]';
    case 'low':
    default:
      return 'bg-[#E8F5EE] text-[#2D6B4A]';
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
          <div className="space-y-4 rounded-xl border-[0.5px] border-border bg-secondary p-4">
            <p className="text-[11px] font-medium text-muted-foreground">
              免責：以下為影像辨識推估與一般性說明，請勿作為醫療或過敏唯一依據。
            </p>

            <div className="flex flex-wrap items-end gap-2 border-b border-border pb-3">
              <span className="text-[11px] text-muted-foreground">
                整體安全分數
              </span>
              <span className="tabular-nums text-[28px] font-semibold leading-none text-foreground">
                {report.safety_score}
              </span>
              <span className="text-[13px] text-muted-foreground">/ 100</span>
            </div>

            {report.alert_keywords.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  偵測到的警示
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {report.alert_keywords.map((kw, i) => (
                    <button
                      key={`${kw}-${i}`}
                      type="button"
                      className="rounded-full bg-[#FFF4E5] px-2.5 py-1 text-left text-[12px] text-[#C57A12] ring-1 ring-[#EF9F27]/45 transition-colors active:bg-[#FFF8ED]"
                      aria-label={`${kw} 說明`}
                      onClick={() => {
                        const { title, body } = resolveAlertKeywordExplanation(kw);
                        openDetailSheet(title, body);
                      }}>
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {report.audience_advice.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  族群建議
                </p>
                <ul className="mt-2 space-y-2">
                  {report.audience_advice.map((a, i) => (
                    <li
                      key={`${a.segment}-${i}`}
                      className="rounded-lg border-[0.5px] border-border bg-card px-3 py-2 text-[13px]">
                      <span className="font-medium text-foreground">
                        {audienceSegmentLabelZh(a.segment)}：
                      </span>
                      {a.summary}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {report.risk_items.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  成分與風險分級
                </p>
                <ul className="mt-2 space-y-2">
                  {report.risk_items.map((r, i) => (
                    <li key={`${r.name}-${i}`}>
                      <button
                        type="button"
                        className="w-full rounded-lg border-[0.5px] border-border bg-card px-2.5 py-2 text-left text-[13px] transition-colors active:bg-secondary"
                        onClick={() => {
                          const { title, body } = resolveRiskItemExplanation(
                            r.name,
                            r.plain_language,
                          );
                          openDetailSheet(title, body);
                        }}>
                        <span className="font-medium text-foreground">
                          {r.name}
                        </span>
                        <span
                          className={cn(
                            'ml-2 rounded px-1 text-[10px] font-medium',
                            tierBadgeClass(r.tier),
                          )}>
                          {tierLabelZh(r.tier)}
                        </span>
                        {r.plain_language ? (
                          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                            {r.plain_language}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                過敏原標示（14 類矩陣）
              </p>
              {report.allergens_tw14.some((row) => row.detected) ? (
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {report.allergens_tw14
                    .filter((row) => row.detected)
                    .map((row) => (
                      <li key={row.category_key}>
                        <button
                          type="button"
                          className="w-full rounded-md border-[0.5px] border-[#EF9F27]/45 bg-[#FFF4E5] px-2 py-1.5 text-left text-[12px] text-[#B45309] transition-colors active:bg-[#FFF8ED]"
                          onClick={() => {
                            openDetailSheet(
                              TW_ALLERGEN_LABEL_ZH[row.category_key],
                              allergenDetailSheetBody(
                                row.category_key,
                                row.detail,
                              ),
                            );
                          }}>
                          <span className="font-medium">
                            {TW_ALLERGEN_LABEL_ZH[row.category_key]}
                          </span>
                          <span className="ml-1">· 疑似含有</span>
                          {row.detail ? (
                            <span className="mt-0.5 block text-[11px] opacity-95">
                              {row.detail}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                  本次未偵測到須標示之過敏原類別（依影像可讀文字推估，非完整標示認證）。
                </p>
              )}
            </div>

            {report.summary_note ? (
              <p className="text-[13px] leading-relaxed text-foreground">
                {report.summary_note}
              </p>
            ) : null}

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
          </div>
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
