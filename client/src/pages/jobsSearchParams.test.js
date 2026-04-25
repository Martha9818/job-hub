const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'jobsSearchParams.js'), 'utf8')
  .replace('export function updateJobSearchParams', 'function updateJobSearchParams');
const updateJobSearchParams = new Function(`${source}; return updateJobSearchParams;`)();

test('page changes are not reset back to page 1', () => {
  const params = updateJobSearchParams('keyword=机械&page=1', 'page', '2');
  assert.equal(params.get('page'), '2');
  assert.equal(params.get('keyword'), '机械');
});

test('filter changes reset pagination to first page', () => {
  const params = updateJobSearchParams('keyword=机械&page=3', 'location', '上海');
  assert.equal(params.get('page'), '1');
  assert.equal(params.get('location'), '上海');
  assert.equal(params.get('keyword'), '机械');
});
