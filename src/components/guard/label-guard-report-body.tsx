'use client';

import {
  allergenDetailSheetBody,
  canOpenAlertKeywordDetail,
  resolveAlertKeywordExplanation,
  resolveRiskItemExplanation,
} from '@/lib/food/label-guard-lookups';
import {
  audienceSegmentLabelZh,
  safetyScoreTextClass,
  tierLabelZh,
  TW_ALLERGEN_LABEL_ZH,
  type LabelGuardReport,
  type RiskTier,
} from '@/lib/food/label-guard-report';
import { cn } from '@/lib/utils/cn';

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

type LabelGuardReportBodyProps = {
  report: LabelGuardReport;
  onOpenDetail: (title: string, body: string) => void;
  className?: string;
};

export function LabelGuardReportBody({
  report,
  onOpenDetail,
  className,
}: LabelGuardReportBodyProps) {
  return (
    <div
      className={cn(
        'space-y-4 rounded-xl border-[0.5px] border-border bg-secondary p-4',
        className,
      )}>
      <p className="text-[11px] font-medium text-muted-foreground">
        免責：以下為影像辨識推估與一般性說明，請勿作為醫療或過敏唯一依據。
      </p>

      <div className="flex flex-wrap items-end gap-2 border-b border-border pb-3">
        <span className="text-[11px] text-muted-foreground">整體安全分數</span>
        <span
          className={cn(
            'tabular-nums text-[28px] font-semibold leading-none',
            safetyScoreTextClass(report.safety_score),
          )}>
          {report.safety_score}
        </span>
        <span className="text-[13px] text-muted-foreground">/ 100</span>
      </div>

      {report.alert_keywords.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">偵測到的警示</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {report.alert_keywords.map((kw, i) => {
              const canOpen = canOpenAlertKeywordDetail(kw);
              if (!canOpen) {
                return (
                  <span
                    key={`${kw}-${i}`}
                    className="rounded-full bg-muted px-2.5 py-1 text-left text-[12px] text-muted-foreground ring-1 ring-border"
                    aria-label={`${kw}（一般性參考）`}>
                    {kw}
                  </span>
                );
              }

              return (
                <button
                  key={`${kw}-${i}`}
                  type="button"
                  className="rounded-full bg-[#FFF4E5] px-2.5 py-1 text-left text-[12px] text-[#C57A12] ring-1 ring-[#EF9F27]/45 transition-colors active:bg-[#FFF8ED]"
                  aria-label={`${kw} 說明`}
                  onClick={() => {
                    const { title, body } = resolveAlertKeywordExplanation(kw);
                    onOpenDetail(title, body);
                  }}>
                  {kw}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {report.audience_advice.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">族群建議</p>
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
          <p className="text-[11px] font-medium text-muted-foreground">成分與風險分級</p>
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
                    onOpenDetail(title, body);
                  }}>
                  <span className="font-medium text-foreground">{r.name}</span>
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
        <p className="text-[11px] font-medium text-muted-foreground">過敏原標示（14 類矩陣）</p>
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
                      onOpenDetail(
                        TW_ALLERGEN_LABEL_ZH[row.category_key],
                        allergenDetailSheetBody(row.category_key, row.detail),
                      );
                    }}>
                    <span className="font-medium">{TW_ALLERGEN_LABEL_ZH[row.category_key]}</span>
                    <span className="ml-1">· 疑似含有</span>
                    {row.detail ? (
                      <span className="mt-0.5 block text-[11px] opacity-95">{row.detail}</span>
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
        <p className="text-[13px] leading-relaxed text-foreground">{report.summary_note}</p>
      ) : null}
    </div>
  );
}
