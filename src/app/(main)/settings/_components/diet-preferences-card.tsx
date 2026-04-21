import { SectionCard } from '@/components/ui/section-card';

import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';

interface DietPreferencesCardProps {
  dietMethodText: string;
  allergenText: string;
  tracksGlycemicConcern: boolean;
  glycemicPending?: boolean;
  error?: string | null;
  onEditMethod: () => void;
  onEditAllergens: () => void;
  onToggleGlycemic: (next: boolean) => void;
}

export function DietPreferencesCard({
  dietMethodText,
  allergenText,
  tracksGlycemicConcern,
  glycemicPending,
  error,
  onEditMethod,
  onEditAllergens,
  onToggleGlycemic,
}: DietPreferencesCardProps) {
  return (
    <SectionCard className="bg-neutral-bg-primary">
      <div className="mb-1 text-[15px] font-medium text-foreground">飲食偏好</div>
      <SettingsRow label="飲食方式" value={dietMethodText} onClick={onEditMethod} />
      <SettingsRow label="忌食 / 過敏" value={allergenText} onClick={onEditAllergens} />
      <div className="flex items-start justify-between gap-3 border-b-0 py-3">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[13px] text-neutral-text-tertiary">
            糖量／血糖相關提醒
          </p>
          <p className="mt-0.5 text-[11px] font-normal leading-snug text-muted-foreground">
            開啟後，成分標分析會加強高糖與血糖相關提示（仍非醫療建議）。
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={tracksGlycemicConcern}
          disabled={glycemicPending}
          onClick={() => onToggleGlycemic(!tracksGlycemicConcern)}
          className={[
            'relative h-7 w-11 shrink-0 rounded-full transition-colors',
            tracksGlycemicConcern ? 'bg-primary' : 'bg-muted',
            glycemicPending ? 'opacity-60' : '',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-transform',
              tracksGlycemicConcern ? 'translate-x-[18px]' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>
      </div>
      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
    </SectionCard>
  );
}
