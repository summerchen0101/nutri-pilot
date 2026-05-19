'use client';

import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';

import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { cn } from '@/lib/utils/cn';

const DASHBOARD_INSIGHT_SEEN_KEY_PREFIX = 'nutri_dash_insp_seen:';

function storageKeyForUser(userId: string) {
  return `${DASHBOARD_INSIGHT_SEEN_KEY_PREFIX}${userId}`;
}

export interface DashboardInsightFabProps {
  userId: string;
  insightPeriodDate: string;
  justGenerated: boolean;
  bullets: string[];
  status: number;
  error?: string;
}

export function DashboardInsightFab({
  userId,
  insightPeriodDate,
  justGenerated,
  bullets,
  status,
  error,
}: DashboardInsightFabProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showCue, setShowCue] = useState(justGenerated);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKeyForUser(userId));
      const unread = stored !== insightPeriodDate;
      setShowCue(unread || justGenerated);
    } catch {
      setShowCue(true);
    }
  }, [userId, insightPeriodDate, justGenerated]);

  const markSeenOpenSheet = () => {
    try {
      localStorage.setItem(storageKeyForUser(userId), insightPeriodDate);
    } catch {
      /* ignore quota / private mode */
    }
    setShowCue(false);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="今日建議"
        onClick={markSeenOpenSheet}
        className={cn('relative', HEADER_ACTION_ICON_CLASS)}>
        <Lightbulb className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
        {showCue ? (
          <span
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary"
            aria-hidden
          />
        ) : null}
      </button>

      <BottomSheetShell
        open={sheetOpen}
        title="今日建議"
        onClose={closeSheet}>
        {status !== 200 && error ? (
          <p className="text-caption text-destructive">{error}</p>
        ) : null}
        {bullets.length > 0 ? (
          <ul className="mt-1 space-y-2 pb-2">
            {bullets.map((text, idx) => (
              <li key={`${idx}-${text.slice(0, 20)}`} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-body leading-relaxed text-primary-foreground">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        ) : status === 200 ? (
          <p className="text-caption text-muted-foreground">尚無建議內容。</p>
        ) : null}
      </BottomSheetShell>
    </>
  );
}
