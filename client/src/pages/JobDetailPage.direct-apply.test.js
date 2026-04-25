const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'JobDetailPage.jsx'), 'utf8');

test('job detail opens the original job URL and records applied status locally', () => {
  assert.equal(source.includes('to="/apply"'), false);
  assert.match(source, /href=\{job\.source_url\}[\s\S]*打开招聘/);
  assert.match(source, /markApplied\(job\)[\s\S]*标记已投递/);
});
