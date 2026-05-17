'use client';

import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';

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
        className={cn(
          'fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-[45] flex h-14 w-14 shrink-0 touch-manipulation items-center justify-center rounded-full border-hairline border-primary/30 bg-primary-light text-primary transition-transform active:scale-[0.97]',
          showCue && 'ring-2 ring-primary/45 ring-offset-2 ring-offset-background animate-pulse',
        )}>
        <Lightbulb className="h-6 w-6" strokeWidth={1.8} aria-hidden />
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
