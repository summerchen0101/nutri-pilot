import { Pencil, Ruler } from "lucide-react";

import { SECTION_HEADING_ACTION_ICON_CLASS } from "@/components/layout/header-action-icon-styles";
import { MetricTile } from "@/components/ui/metric-tile";
import { SectionCard } from "@/components/ui/section-card";
import { SectionHeading } from "@/components/ui/section-heading";

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
    <SectionCard>
      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionHeading icon={Ruler}>身體數據</SectionHeading>
        <button
          type="button"
          aria-label="編輯身體數據"
          className={SECTION_HEADING_ACTION_ICON_CLASS}
          onClick={onEdit}>
          <Pencil className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricTile
          label="身高cm"
          value={heightCm || "-"}
          className="px-2 py-3 text-center"
        />
        <MetricTile
          label="體重kg"
          value={weightKg || "-"}
          className="px-2 py-3 text-center"
        />
        <MetricTile
          label="BMI"
          value={
            <span className={bmiToneClass}>
              {bmiValue != null ? String(bmiValue) : "-"}
            </span>
          }
          className="px-2 py-3 text-center"
        />
        <MetricTile label="體脂%" value="-" className="px-2 py-3 text-center" />
        <MetricTile
          label="BMR kcal"
          value={bmr != null ? Math.round(bmr).toLocaleString() : "-"}
          className="px-2 py-3 text-center"
        />
        <MetricTile
          label="TDEE kcal"
          value={tdeePreview > 0 ? tdeePreview.toLocaleString() : "-"}
          className="px-2 py-3 text-center"
        />
      </div>
      <div className="mt-2 flex items-center justify-between rounded-lg bg-primary-light px-3 py-2">
        <span className="text-xs text-primary">BMI 正常範圍（18.5-24.9）</span>
        <span className={["text-xs font-medium", bmiToneClass].join(" ")}>
          {bmiStatus}
        </span>
      </div>
    </SectionCard>
  );
}
