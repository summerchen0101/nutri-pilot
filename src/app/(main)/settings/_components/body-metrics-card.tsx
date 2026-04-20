import { MetricTile } from '@/components/ui/metric-tile';
import { SectionCard } from '@/components/ui/section-card';

interface BodyMetricsCardProps {
  heightCm: string;
  weightKg: string;
  bmiValue: number | null;
  bmr: number | null;
  tdeePreview: number;
  bmiStatus: string;
  bmiToneClass: string;
  onEdit: () => void;
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
}: BodyMetricsCardProps) {
  return (
    <SectionCard className="bg-neutral-bg-primary">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[15px] font-medium text-foreground">身體數據</div>
        <button
          type="button"
          className="rounded-[8px] border border-primary px-3 py-1 text-[13px] text-primary"
          onClick={onEdit}
        >
          更新
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricTile label="身高cm" value={heightCm || '-'} className="px-2 py-3 text-center" />
        <MetricTile label="體重kg" value={weightKg || '-'} className="px-2 py-3 text-center" />
        <MetricTile
          label="BMI"
          value={<span className={bmiToneClass}>{bmiValue != null ? String(bmiValue) : '-'}</span>}
          className="px-2 py-3 text-center"
        />
        <MetricTile label="體脂%" value="-" className="px-2 py-3 text-center" />
        <MetricTile
          label="BMR kcal"
          value={bmr != null ? Math.round(bmr).toLocaleString() : '-'}
          className="px-2 py-3 text-center"
        />
        <MetricTile
          label="TDEE kcal"
          value={tdeePreview > 0 ? tdeePreview.toLocaleString() : '-'}
          className="px-2 py-3 text-center"
        />
      </div>
      <div className="mt-2 flex items-center justify-between rounded-lg bg-primary-light px-3 py-2">
        <span className="text-[11px] text-primary">BMI 正常範圍（18.5-24.9）</span>
        <span className={['text-[11px] font-medium', bmiToneClass].join(' ')}>{bmiStatus}</span>
      </div>
    </SectionCard>
  );
}
