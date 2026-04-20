import { SectionCard } from '@/components/ui/section-card';

interface ProfileSummaryCardProps {
  name: string;
  email: string;
  dayCount: number;
  avatarChar: string;
  onEditName: () => void;
}

export function ProfileSummaryCard({
  name,
  email,
  dayCount,
  avatarChar,
  onEditName,
}: ProfileSummaryCardProps) {
  return (
    <SectionCard className="bg-neutral-bg-primary">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-light text-[20px] font-medium text-primary">
          {avatarChar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-foreground">{name}</div>
          <div className="mt-0.5 truncate text-[13px] text-neutral-text-tertiary">{email}</div>
          <div className="mt-1.5 flex gap-2">
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
              Free 會員
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-neutral-text-secondary">
              第 {dayCount} 天
            </span>
          </div>
        </div>
        <button
          type="button"
          className="rounded-[8px] border border-primary px-3 py-1.5 text-[13px] text-primary"
          onClick={onEditName}
        >
          編輯
        </button>
      </div>
    </SectionCard>
  );
}
