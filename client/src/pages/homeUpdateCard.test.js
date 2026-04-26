import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatUpdateDateTime,
  getHomeUpdateCardContent,
} from './homeUpdateCard.js';

test('formatUpdateDateTime renders Shanghai time in compact datetime form', () => {
  const text = formatUpdateDateTime('2026-04-26T03:01:40.000Z');
  assert.equal(text, '2026-04-26 11:01');
});

test('getHomeUpdateCardContent returns friendly fallback when update status is missing', () => {
  const result = getHomeUpdateCardContent(null);

  assert.equal(result.intervalText, '每 6 小时更新');
  assert.equal(result.lastUpdatedText, '等待首次更新');
  assert.equal(result.nextExpectedText, '等待首次更新');
});
