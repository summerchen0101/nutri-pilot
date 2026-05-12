'use client';

import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { ACTIVITY_GROUPS } from '@/lib/activity/activity-groups';
import { ACTIVITY_TYPE_LABEL } from '@/lib/activity/activity-type-labels';
import type { ActivityType } from '@/lib/activity/activity-types';
import { cn } from '@/lib/utils/cn';

interface ActivityTypePickerSheetProps {
  open: boolean;
  onClose: () => void;
  activityType: ActivityType;
  onSelect: (type: ActivityType) => void;
}

export function ActivityTypePickerSheet({
  open,
  onClose,
  activityType,
  onSelect,
}: ActivityTypePickerSheetProps) {
  return (
    <BottomSheetShell open={open} title="選擇運動類型" onClose={onClose}>
      <div className="max-h-[min(60vh,420px)] overflow-y-auto pb-2">
        <div className="grid gap-4">
          {ACTIVITY_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                {g.label}
              </p>
              <div className="grid gap-2">
                {g.types.map((t) => {
                  const active = activityType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      className={cn(
                        'flex min-h-11 w-full items-center rounded-[10px] border px-3 text-left text-[13px]',
                        active
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-card text-foreground',
                      )}
                      onClick={() => {
                        onSelect(t);
                        onClose();
                      }}
                    >
                      {ACTIVITY_TYPE_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </BottomSheetShell>
  );
}
