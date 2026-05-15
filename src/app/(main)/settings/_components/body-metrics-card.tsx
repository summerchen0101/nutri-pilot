import { Ruler } from 'lucide-react';

import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';
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
  const heightDisplay = heightCm.trim().length > 0 ? `${heightCm} cm` : '-';
  const weightDisplay = weightKg.trim().length > 0 ? `${weightKg} kg` : '-';
  const bmiDisplay = bmiValue != null ? String(bmiValue) : '-';
  const bmrDisplay =
    bmr != null ? `${Math.round(bmr).toLocaleString()} kcal` : '-';
  const tdeeDisplay =
    tdeePreview > 0 ? `${tdeePreview.toLocaleString()} kcal` : '-';

  return (
    <SectionCard>
      <SectionHeading icon={Ruler} className="mb-1">
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
      />
      <SettingsRow label="BMR" value={bmrDisplay} />
      <SettingsRow label="TDEE" value={tdeeDisplay} />
      <SettingsRow
        label="BMI 判讀"
        value={bmiStatus}
        valueClassName={bmiToneClass}
        withBorder={false}
      />
    </SectionCard>
  );
}
