'use client';

import { useState } from 'react';

import { FoodLogDayList } from '@/app/(main)/log/_components/food-log-day-list';
import { LogDayKcalSummary } from '@/app/(main)/log/_components/log-day-kcal-summary';
import { LogVitalsReadonly } from '@/app/(main)/log/_components/log-vitals-readonly';
import type { LogVitalSnapshot } from '@/app/(main)/log/_components/log-vitals-card';
import {
  ActivityLogSection,
  type ActivityLogRow,
} from '@/app/(main)/log/activity-log-section';
import {
  LogSectionTabs,
  type LogSectionTab,
} from '@/app/(main)/log/log-section-tabs';
import type { FoodLogSnapshot } from '@/app/(main)/log/log-food-snapshot';
import { totalDayKcalFromLogs } from '@/app/(main)/log/log-food-snapshot';
import { LOG_FOOD_LIST_TITLE } from '@/lib/log/log-date-label';

export interface LogHistoryDayClientProps {
  date: string;
  dailyCalTarget: number | null;
  logs: FoodLogSnapshot[];
  activities: ActivityLogRow[];
  vital: LogVitalSnapshot;
}

export function LogHistoryDayClient({
  date,
  dailyCalTarget,
  logs,
  activities,
  vital,
}: LogHistoryDayClientProps) {
  const [sectionTab, setSectionTab] = useState<LogSectionTab>('food');
  const dayTotal = totalDayKcalFromLogs(logs);

  return (
    <div className="space-y-2.5">
      <LogSectionTabs
        date={date}
        active={sectionTab}
        onTabChange={setSectionTab}
        linkMode="state"
      />

      {sectionTab === 'food' ? (
        <LogDayKcalSummary
          consumedKcal={dayTotal}
          dailyCalTarget={dailyCalTarget}
        />
      ) : null}

      {sectionTab === 'food' ? (
        <FoodLogDayList logs={logs} readOnly listTitle={LOG_FOOD_LIST_TITLE} />
      ) : null}

      {sectionTab === 'activity' ? (
        <ActivityLogSection date={date} rows={activities} readOnly />
      ) : null}

      {sectionTab === 'body' ? <LogVitalsReadonly vital={vital} /> : null}
    </div>
  );
}
