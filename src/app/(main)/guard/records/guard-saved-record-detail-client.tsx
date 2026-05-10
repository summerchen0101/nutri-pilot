'use client';

import { useState } from 'react';

import { GuardSavedRecordRenameButton } from '@/app/(main)/guard/records/guard-saved-record-rename-button';
import { LabelGuardReportBody } from '@/components/guard/label-guard-report-body';
import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import type { LabelGuardReport } from '@/lib/food/label-guard-report';

type GuardSavedRecordDetailClientProps = {
  recordId: string;
  name: string;
  createdAtLabel: string;
  imageUrl: string | null;
  imageUnavailableMessage: string | null;
  report: LabelGuardReport;
};

export function GuardSavedRecordDetailClient({
  recordId,
  name,
  createdAtLabel,
  imageUrl,
  imageUnavailableMessage,
  report,
}: GuardSavedRecordDetailClientProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailBody, setDetailBody] = useState('');

  function openDetailSheet(title: string, body: string) {
    setDetailTitle(title);
    setDetailBody(body);
    setDetailOpen(true);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="rounded-xl bg-card px-4 py-3">
          <h1 className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0 text-[17px] font-semibold text-foreground">
            <span className="min-w-0 break-words">{name}</span>
            <GuardSavedRecordRenameButton
              recordId={recordId}
              initialName={name}
              className="shrink-0"
            />
          </h1>
          <p className="mt-0.5 text-caption text-muted-foreground">儲存時間：{createdAtLabel}</p>
        </div>

        <div className="overflow-hidden rounded-xl bg-card">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="標籤原圖"
              className="max-h-72 w-full bg-neutral-bg-primary object-contain"
            />
          ) : (
            <div className="flex min-h-[120px] items-center justify-center bg-neutral-bg-primary px-4 py-6">
              <p className="text-center text-[13px] text-muted-foreground">
                {imageUnavailableMessage ?? '無法載入原圖'}
              </p>
            </div>
          )}
        </div>

        <LabelGuardReportBody report={report} onOpenDetail={openDetailSheet} />
      </div>

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
