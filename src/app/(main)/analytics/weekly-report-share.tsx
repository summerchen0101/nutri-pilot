'use client';

import html2canvas from 'html2canvas';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

export function WeeklyReportShare(props: {
  rangeLabel: string;
  avgKcal: number;
  weightSummaryLine: string;
  activityMinutesLine: string;
  activityKcalLine: string;
  insightLines: string[];
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shareOrDownload = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    setBusy(true);
    setErr(null);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
      if (!blob) throw new Error('無法產生圖片');

      const file = new File([blob], 'nutriguard-weekly.png', {
        type: 'image/png',
      });

      if (
        typeof navigator !== 'undefined' &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: '健康週報摘要',
          text:
            '僅供參考，非醫療建議。資料來源：Nutri Guard。',
        });
      } else if (typeof document !== 'undefined') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nutriguard-weekly.png';
        a.rel = 'noopener';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '無法分享或下載');
    } finally {
      setBusy(false);
    }
  }, []);

  const previewBullets =
    props.insightLines.length > 0
      ? props.insightLines.slice(0, 4)
      : ['尚無 AI 週報摘要，仍可分享熱量、體重與運動摘要。'];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-medium text-[#EF9F27]">分享週報卡</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          將下方卡片存成圖片分享給親友（非醫療建議）。
        </p>
      </div>

      <div
        ref={cardRef}
        className="rounded-xl border-[0.5px] border-border bg-card p-4 shadow-sm">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Weekly snapshot
        </p>
        <p className="mt-1 text-[18px] font-semibold text-foreground">
          本週 · {props.rangeLabel}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground">平均熱量（有紀錄日）</p>
            <p className="mt-0.5 tabular-nums text-[17px] font-medium text-foreground">
              {props.avgKcal > 0 ? props.avgKcal : '—'}
              {props.avgKcal > 0 ? (
                <span className="text-[12px] font-normal text-muted-foreground">
                  {' '}
                  kcal
                </span>
              ) : null}
            </p>
          </div>
          <div className="rounded-lg bg-secondary px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground">體重</p>
            <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground">
              {props.weightSummaryLine}
            </p>
          </div>
          <div className="rounded-lg bg-secondary px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground">運動時間</p>
            <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground">
              {props.activityMinutesLine}
            </p>
          </div>
          <div className="rounded-lg bg-secondary px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground">估計消耗</p>
            <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground">
              {props.activityKcalLine}
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5 border-t-[0.5px] border-border pt-3">
          {previewBullets.map((line, idx) => (
            <li
              key={`${idx}-${line.slice(0, 8)}`}
              className="text-[12px] leading-relaxed text-foreground">
              · {line}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[10px] leading-snug text-muted-foreground">
          僅供參考，非醫療建議。
        </p>
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={busy}
        onClick={() => void shareOrDownload()}>
        {busy ? '產生圖片中…' : '分享或下載週報圖'}
      </Button>
      {err ? (
        <p className="text-center text-[12px] text-destructive">{err}</p>
      ) : null}
    </div>
  );
}
