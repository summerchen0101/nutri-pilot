import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addCalendarDaysISO } from '@/lib/onboarding/date';

import {
  calendarDaysAgo,
  getLogDateMode,
  isLogDateMutable,
  logDateMutationError,
  LOG_MUTABLE_PAST_DAY_COUNT,
} from './log-date-policy';

const TODAY = '2026-05-26';

describe('log-date-policy', () => {
  it('calendarDaysAgo: today is 0', () => {
    assert.equal(calendarDaysAgo(TODAY, TODAY), 0);
  });

  it('calendarDaysAgo: future is -1', () => {
    assert.equal(calendarDaysAgo('2026-05-27', TODAY), -1);
  });

  it('getLogDateMode: today and past 3 days editable', () => {
    assert.equal(getLogDateMode(TODAY, TODAY), 'today');
    for (let d = 1; d <= LOG_MUTABLE_PAST_DAY_COUNT; d += 1) {
      const iso = addCalendarDaysISO(TODAY, -d);
      assert.equal(getLogDateMode(iso, TODAY), 'recent_editable');
    }
  });

  it('getLogDateMode: 4th day ago is readonly', () => {
    const iso = addCalendarDaysISO(TODAY, -(LOG_MUTABLE_PAST_DAY_COUNT + 1));
    assert.equal(getLogDateMode(iso, TODAY), 'readonly');
  });

  it('isLogDateMutable matches editable window', () => {
    assert.equal(isLogDateMutable(TODAY, TODAY), true);
    assert.equal(
      isLogDateMutable(addCalendarDaysISO(TODAY, -3), TODAY),
      true,
    );
    assert.equal(
      isLogDateMutable(addCalendarDaysISO(TODAY, -4), TODAY),
      false,
    );
  });

  it('logDateMutationError blocks readonly dates', () => {
    assert.equal(logDateMutationError(TODAY, TODAY), null);
    assert.equal(
      logDateMutationError(addCalendarDaysISO(TODAY, -4), TODAY),
      '僅能修改今日或近 3 日的紀錄',
    );
  });
});
