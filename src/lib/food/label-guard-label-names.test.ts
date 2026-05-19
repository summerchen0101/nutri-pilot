import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LabelGuardLabelNames } from './label-guard-report';
import {
  findLabelNamesForKey,
  formatPackageLabelNamesSheet,
  hasPackageLabelDetail,
} from './label-guard-label-names';

const SAMPLE_DETAILS: LabelGuardLabelNames[] = [
  { match_key: '檸檬黃', label_names: ['檸檬黃', '日落黃'] },
  { match_key: '人工香料', label_names: [] },
];

describe('label-guard-label-names', () => {
  it('findLabelNamesForKey matches substring 檸檬黃（增色劑）', () => {
    const names = findLabelNamesForKey('檸檬黃（增色劑）', SAMPLE_DETAILS);
    assert.deepEqual(names, ['檸檬黃', '日落黃']);
  });

  it('hasPackageLabelDetail is true when match exists even if label_names empty', () => {
    assert.equal(hasPackageLabelDetail('人工香料', SAMPLE_DETAILS), true);
  });

  it('formatPackageLabelNamesSheet lists names when present', () => {
    const { title, body } = formatPackageLabelNamesSheet({
      title: '防腐劑',
      labelNames: ['苯甲酸鈉', '己二烯酸鉀'],
    });
    assert.match(title, /本次標示/);
    assert.match(body, /苯甲酸鈉/);
    assert.match(body, /・/);
  });

  it('formatPackageLabelNamesSheet shows unreadable message when empty', () => {
    const { body } = formatPackageLabelNamesSheet({
      title: '人工香料',
      labelNames: [],
    });
    assert.match(body, /未能辨識/);
  });
});
