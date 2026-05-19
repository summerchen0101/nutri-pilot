'use client';

import { LabelGuardAlertChip } from '@/components/guard/label-guard-alert-chip';
import { LabelGuardInfoTrigger } from '@/components/guard/label-guard-info-trigger';
import { allergenDetailSheetBody } from '@/lib/food/label-guard-lookups';
import { sortRiskItemsByTier } from '@/lib/food/label-guard-enrich';
import {
  findLabelNamesForKey,
  formatAdditiveDetailSheet,
  formatAllergenPackageSheet,
  hasPackageLabelDetail,
} from '@/lib/food/label-guard-label-names';
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
      return 'bg-primary text-white';
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
  const sortedRiskItems = sortRiskItemsByTier(report.risk_items);
  const labelNameDetails = report.label_name_details;

  function openPackageDetail(matchKey: string) {
    const labelNames = findLabelNamesForKey(matchKey, labelNameDetails) ?? [];
    const sheet = formatAdditiveDetailSheet({
      title: matchKey,
      labelNames,
      includePackageSection: true,
    });
    onOpenDetail(sheet.title, sheet.body);
  }

  function openGeneralDetail(matchKey: string) {
    const sheet = formatAdditiveDetailSheet({
      title: matchKey,
      includePackageSection: false,
    });
    onOpenDetail(sheet.title, sheet.body);
  }

  return (
    <div
      className={cn('space-y-4 rounded-xl bg-card p-4', className)}>
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
            {report.alert_keywords.map((kw, i) => (
              <LabelGuardAlertChip
                key={`${kw}-${i}`}
                keyword={kw}
                labelNameDetails={labelNameDetails}
                onOpenDetail={onOpenDetail}
              />
            ))}
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
                className="rounded-lg bg-card px-3 py-2 text-[13px]">
                <span className="font-medium text-foreground">
                  {audienceSegmentLabelZh(a.segment)}：
                </span>
                {a.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sortedRiskItems.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">
            成分、添加物與風險分級
          </p>
          <ul className="mt-2 space-y-2">
            {sortedRiskItems.map((r, i) => {
              const showPackageInfo = hasPackageLabelDetail(
                r.name,
                labelNameDetails,
              );
              return (
                <li key={`${r.name}-${i}`}>
                  <div className="w-full rounded-lg bg-card px-2.5 py-2 text-left text-[13px]">
                    <div className="flex items-start gap-1">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left transition-colors active:opacity-80"
                        onClick={() => openGeneralDetail(r.name)}>
                        <span className="font-medium text-foreground">{r.name}</span>
                        <span
                          className={cn(
                            'ml-2 rounded px-1 text-[10px] font-medium',
                            tierBadgeClass(r.tier),
                          )}>
                          {tierLabelZh(r.tier)}
                        </span>
                      </button>
                      {showPackageInfo ? (
                        <LabelGuardInfoTrigger
                          ariaLabel={`${r.name} 本次標示成分`}
                          onOpen={() => openPackageDetail(r.name)}
                        />
                      ) : null}
                    </div>
                    {r.plain_language ? (
                      <p className="mt-1 text-caption leading-snug text-muted-foreground">
                        {r.plain_language}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-[11px] font-medium text-muted-foreground">過敏原標示（14 類矩陣）</p>
        {report.allergens_tw14.some((row) => row.detected) ? (
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {report.allergens_tw14
              .filter((row) => row.detected)
              .map((row) => {
                const allergenTitle = TW_ALLERGEN_LABEL_ZH[row.category_key];
                const showPackageInfo = hasPackageLabelDetail(
                  allergenTitle,
                  labelNameDetails,
                );
                const generalBody = allergenDetailSheetBody(
                  row.category_key,
                  row.detail,
                );

                return (
                  <li key={row.category_key}>
                    <div className="flex w-full items-start gap-1 rounded-md border-hairline border-[#EF9F27]/45 bg-[#FFF4E5] px-2 py-1.5 text-left text-caption text-[#B45309]">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left transition-colors active:bg-[#FFF8ED]"
                        onClick={() =>
                          onOpenDetail(allergenTitle, generalBody)
                        }>
                        <span className="font-medium">{allergenTitle}</span>
                        <span className="ml-1">· 疑似含有</span>
                        {row.detail ? (
                          <span className="mt-0.5 block text-[11px] opacity-95">
                            {row.detail}
                          </span>
                        ) : null}
                      </button>
                      {showPackageInfo ? (
                        <LabelGuardInfoTrigger
                          ariaLabel={`${allergenTitle} 本次標示成分`}
                          className="text-[#B45309]/80"
                          onOpen={() => {
                            const labelNames =
                              findLabelNamesForKey(
                                allergenTitle,
                                labelNameDetails,
                              ) ?? [];
                            const sheet = formatAllergenPackageSheet({
                              allergenTitle,
                              labelNames,
                              detectedDetail: row.detail,
                              generalBody: allergenDetailSheetBody(
                                row.category_key,
                                null,
                              ),
                            });
                            onOpenDetail(sheet.title, sheet.body);
                          }}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="mt-2 text-caption leading-snug text-muted-foreground">
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
