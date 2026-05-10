'use server';

import { todayLocalISODate } from '@/lib/onboarding/date';

import {
  logWeightForDateAction,
  setWaterMlForDateAction,
} from '@/app/(main)/log/vitals-actions';

export async function logWeightAction(
  weightKgRaw: number,
): Promise<{ error?: string }> {
  return logWeightForDateAction(todayLocalISODate(), weightKgRaw);
}

export async function setWaterMlForTodayAction(
  totalMlRaw: number,
): Promise<{ error?: string }> {
  return setWaterMlForDateAction(todayLocalISODate(), totalMlRaw);
}
