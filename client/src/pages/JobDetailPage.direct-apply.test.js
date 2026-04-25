const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'JobDetailPage.jsx'), 'utf8');

test('job detail immediate apply opens the original job URL instead of the apply page', () => {
  assert.equal(source.includes('to="/apply"'), false);
  assert.match(source, /href=\{job\.source_url\}[\s\S]*立即投递/);
});
