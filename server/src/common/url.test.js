const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeExternalUrl } = require('./url');

test('normalizeExternalUrl preserves valid http links', () => {
  assert.equal(normalizeExternalUrl('https://www.shantui.com/jobs'), 'https://www.shantui.com/jobs');
});

test('normalizeExternalUrl adds a protocol to bare domains', () => {
  assert.equal(normalizeExternalUrl('www.shantui.com'), 'https://www.shantui.com/');
});

test('normalizeExternalUrl resolves protocol-relative and relative links', () => {
  assert.equal(normalizeExternalUrl('//example.com/path'), 'https://example.com/path');
  assert.equal(normalizeExternalUrl('/job/123', { baseUrl: 'https://jobs.example.com' }), 'https://jobs.example.com/job/123');
});

test('normalizeExternalUrl falls back to a searchable recruiting page for missing or invalid links', () => {
  const url = normalizeExternalUrl('', { fallbackQuery: '山推股份 机械技术支持实习' });

  assert.match(url, /^https:\/\/www\.zhipin\.com\/web\/geek\/job\?query=/);
  assert.match(decodeURIComponent(url), /山推股份/);
});
