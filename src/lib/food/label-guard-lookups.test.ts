import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canOpenAlertKeywordDetail,
  resolveAlertKeywordExplanation,
} from './label-guard-lookups';
import {
  enrichLabelGuardReport,
  extractMaxSodiumMgFromText,
} from './label-guard-enrich';

const FALLBACK =
  '此為 AI 依影像辨識所標示之重點詞，僅供一般性參考；實際成分與過敏資訊請以產品包裝、官方標示與醫師建議為準。';

describe('label-guard-lookups', () => {
  it('resolves 膨鬆劑 with dedicated body', () => {
    const { body } = resolveAlertKeywordExplanation('膨鬆劑');
    assert.notEqual(body, FALLBACK);
    assert.match(body, /膨鬆/);
  });

  it('canOpenAlertKeywordDetail for 檸檬黃', () => {
    assert.equal(canOpenAlertKeywordDetail('檸檬黃'), true);
  });

  it('matches high sodium via substring for 高鈉含量偏高', () => {
    const { body } = resolveAlertKeywordExplanation('高鈉含量偏高');
    assert.notEqual(body, FALLBACK);
    assert.match(body, /鈉/);
  });
});

describe('label-guard-enrich', () => {
  it('extractMaxSodiumMgFromText finds mg near 鈉', () => {
    assert.equal(
      extractMaxSodiumMgFromText('每份鈉 980mg，接近一日建議量'),
      980,
    );
  });

  it('adds 高鈉 alert when sodium threshold in plain_language', () => {
    const report: Record<string, unknown> = {
      alert_keywords: ['MSG'],
      risk_items: [
        {
          name: '鈉',
          tier: 'watch',
          plain_language: '每100g鈉 720mg',
        },
      ],
      safety_score: 80,
    };
    enrichLabelGuardReport(report);
    const keywords = report.alert_keywords as string[];
    assert.ok(keywords.some((k) => k.includes('高鈉')));
  });
});
