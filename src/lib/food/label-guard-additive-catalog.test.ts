import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveAlertKeywordExplanation } from './label-guard-lookups';
import {
  formatAdditiveCatalogBody,
  hasAdditiveCatalogEntry,
} from './label-guard-additive-catalog';
import { formatAdditiveDetailSheet } from './label-guard-label-names';

describe('label-guard-additive-catalog', () => {
  it('formatAdditiveCatalogBody for 調味劑 lists 味精', () => {
    const body = formatAdditiveCatalogBody('調味劑');
    assert.ok(body);
    assert.match(body!, /・/);
    assert.match(body!, /味精/);
  });

  it('formatAdditiveCatalogBody for 麥芽糊精', () => {
    assert.ok(formatAdditiveCatalogBody('麥芽糊精'));
  });

  it('resolveAlertKeywordExplanation for 色素 uses bullet list', () => {
    const { body } = resolveAlertKeywordExplanation('色素');
    assert.match(body, /・/);
    assert.match(body, /檸檬黃/);
  });

  it('formatAdditiveDetailSheet includes catalog section', () => {
    const { body } = formatAdditiveDetailSheet({
      title: '調味劑',
      labelNames: ['麩酸鈉'],
      includePackageSection: true,
    });
    assert.match(body, /【本次標示】/);
    assert.match(body, /【此類常見成分說明】/);
    assert.match(body, /麩酸鈉/);
  });

  it('hasAdditiveCatalogEntry for MSG alias', () => {
    assert.equal(hasAdditiveCatalogEntry('MSG'), true);
  });
});
