const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'CampusPage.jsx'), 'utf8');

test('CampusPage reuses paged search params helper instead of always resetting page', () => {
  assert.match(source, /updateJobSearchParams\(searchParams,\s*key,/);
  assert.equal(source.includes("params.set('page', '1')"), false);
});
