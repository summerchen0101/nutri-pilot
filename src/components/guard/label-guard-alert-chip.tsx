'use client';

import { canOpenAlertKeywordDetail } from '@/lib/food/label-guard-lookups';
import {
  findLabelNamesForKey,
  formatAdditiveDetailSheet,
  hasPackageLabelDetail,
} from '@/lib/food/label-guard-label-names';
import type { LabelGuardLabelNames } from '@/lib/food/label-guard-report';
import { LabelGuardInfoTrigger } from '@/components/guard/label-guard-info-trigger';
import { cn } from '@/lib/utils/cn';

type LabelGuardAlertChipProps = {
  keyword: string;
  labelNameDetails?: LabelGuardLabelNames[];
  onOpenDetail: (title: string, body: string) => void;
};

export function LabelGuardAlertChip({
  keyword,
  labelNameDetails,
  onOpenDetail,
}: LabelGuardAlertChipProps) {
  const canOpenGeneral = canOpenAlertKeywordDetail(keyword);
  const showPackageInfo = hasPackageLabelDetail(keyword, labelNameDetails);

  const chipClass = canOpenGeneral
    ? 'rounded-full bg-[#FFF4E5] px-2.5 py-1 text-left text-caption text-[#C57A12] ring-1 ring-[#EF9F27]/45 transition-colors active:bg-[#FFF8ED]'
    : 'rounded-full bg-muted px-2.5 py-1 text-left text-caption text-muted-foreground ring-1 ring-border';

  function openGeneral() {
    if (!canOpenGeneral) return;
    const sheet = formatAdditiveDetailSheet({
      title: keyword,
      includePackageSection: false,
    });
    onOpenDetail(sheet.title, sheet.body);
  }

  function openPackage() {
    const labelNames = findLabelNamesForKey(keyword, labelNameDetails) ?? [];
    const sheet = formatAdditiveDetailSheet({
      title: keyword,
      labelNames,
      includePackageSection: true,
    });
    onOpenDetail(sheet.title, sheet.body);
  }

  if (!canOpenGeneral && !showPackageInfo) {
    return (
      <span
        className={chipClass}
        aria-label={`${keyword}（一般性參考）`}>
        {keyword}
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center gap-0.5">
      {canOpenGeneral ? (
        <button
          type="button"
          className={chipClass}
          aria-label={`${keyword} 一般說明`}
          onClick={openGeneral}>
          {keyword}
        </button>
      ) : (
        <span className={cn(chipClass, 'cursor-default')}>{keyword}</span>
      )}
      {showPackageInfo ? (
        <LabelGuardInfoTrigger
          ariaLabel={`${keyword} 本次標示成分`}
          onOpen={openPackage}
          className={canOpenGeneral ? 'text-[#C57A12]/80' : undefined}
        />
      ) : null}
    </span>
  );
}
