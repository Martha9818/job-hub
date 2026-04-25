const assert = require('node:assert/strict');
const test = require('node:test');
const { buildSupplementalJobs } = require('./supplemental-jobs');

test('buildSupplementalJobs creates a larger unique mechanical job set', () => {
  const jobs = buildSupplementalJobs();
  const ids = new Set(jobs.map(job => job[0]));
  const sourceJobIds = new Set(jobs.map(job => job[2]));

  assert.ok(jobs.length >= 120);
  assert.equal(ids.size, jobs.length);
  assert.equal(sourceJobIds.size, jobs.length);
  assert.ok(jobs.some(job => job[10] === '机械'));
  assert.ok(jobs.some(job => job[11] === '实习'));
  assert.ok(jobs.some(job => job[11] === '应届生'));
  assert.ok(jobs.some(job => job[11] === '3-5年'));
});
