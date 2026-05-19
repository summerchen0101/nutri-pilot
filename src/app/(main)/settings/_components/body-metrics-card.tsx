'use client';

import type { MouseEvent } from 'react';
import { useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';
import {
  BODY_METRICS_INFO_SHEETS,
  type BodyMetricsInfoSheetKind,
} from '@/app/(main)/settings/_lib/body-metrics-sheet-copy';
import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { SectionCard } from '@/components/ui/section-card';
import { SectionHeading } from '@/components/ui/section-heading';

interface BodyMetricsCardProps {
  heightCm: string;
  weightKg: string;
  bmiValue: number | null;
  bmr: number | null;
  tdeePreview: number;
  bmiStatus: string;
  bmiToneClass: string;
  onEdit: () => void;
  onOpenWeightRecord: () => void;
}

function BodyMetricInfoTrigger({
  ariaLabel,
  onOpen,
}: {
  ariaLabel: string;
  onOpen: () => void;
}) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onOpen();
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      className="-m-0.5 inline-flex shrink-0 items-center justify-center rounded-md p-0.5 text-muted-foreground outline-none ring-offset-background transition-opacity hover:opacity-80 active:opacity-70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
      <FaInfoCircle className="size-[14px]" aria-hidden />
    </button>
  );
}

export function BodyMetricsCard({
  heightCm,
  weightKg,
  bmiValue,
  bmr,
  tdeePreview,
  bmiStatus,
  bmiToneClass,
  onEdit,
  onOpenWeightRecord,
}: BodyMetricsCardProps) {
  const [infoSheet, setInfoSheet] = useState<BodyMetricsInfoSheetKind | null>(
    null,
  );

  const heightDisplay = heightCm.trim().length > 0 ? `${heightCm} cm` : '-';
  const weightDisplay = weightKg.trim().length > 0 ? `${weightKg} kg` : '-';
  const bmiDisplay = bmiValue != null ? String(bmiValue) : '-';
  const bmrDisplay =
    bmr != null ? `${Math.round(bmr).toLocaleString()} kcal` : '-';
  const tdeeDisplay =
    tdeePreview > 0 ? `${tdeePreview.toLocaleString()} kcal` : '-';

  const activeSheet = infoSheet != null ? BODY_METRICS_INFO_SHEETS[infoSheet] : null;

  return (
    <SectionCard>
      <SectionHeading variant="nested" className="mb-1">
        身體數據
      </SectionHeading>
      <SettingsRow label="身高" value={heightDisplay} onClick={onEdit} />
      <SettingsRow
        label="體重"
        value={weightDisplay}
        onClick={onOpenWeightRecord}
      />
      <SettingsRow
        label="BMI"
        value={bmiDisplay}
        valueClassName={bmiToneClass}
        labelAccessory={
          <BodyMetricInfoTrigger
            ariaLabel="BMI 說明"
            onOpen={() => setInfoSheet('bmi')}
          />
        }
      />
      <SettingsRow
        label="BMR"
        value={bmrDisplay}
        labelAccessory={
          <BodyMetricInfoTrigger
            ariaLabel="BMR 說明"
            onOpen={() => setInfoSheet('bmr')}
          />
        }
      />
      <SettingsRow
        label="TDEE"
        value={tdeeDisplay}
        labelAccessory={
          <BodyMetricInfoTrigger
            ariaLabel="TDEE 說明"
            onOpen={() => setInfoSheet('tdee')}
          />
        }
      />
      <SettingsRow
        label="BMI 判讀"
        value={bmiStatus}
        valueClassName={bmiToneClass}
        withBorder={false}
      />

      <BottomSheetShell
        open={activeSheet != null}
        title={activeSheet?.title ?? ''}
        onClose={() => setInfoSheet(null)}>
        {activeSheet ? (
          <div className="space-y-2 pb-2 text-body text-foreground">
            {activeSheet.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
      </BottomSheetShell>
    </SectionCard>
  );
}
