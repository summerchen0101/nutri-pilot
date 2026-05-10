'use server';

import { todayLocalISODate } from '@/lib/onboarding/date';

import { setWaterMlForDateAction } from '@/app/(main)/log/vitals-actions';

export async function setWaterMlForTodayAction(
  totalMlRaw: number,
): Promise<{ error?: string }> {
  return setWaterMlForDateAction(todayLocalISODate(), totalMlRaw);
}
