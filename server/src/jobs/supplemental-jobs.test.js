const assert = require('node:assert/strict');
const test = require('node:test');

const { buildSupplementalJobs } = require('./supplemental-jobs');
const { jobMatchesPreset } = require('./presets');

test('buildSupplementalJobs creates a larger unique mechanical job set', () => {
  const jobs = buildSupplementalJobs();
  const ids = new Set(jobs.map((job) => job[0]));
  const sourceJobIds = new Set(jobs.map((job) => job[2]));

  assert.ok(jobs.length >= 200);
  assert.equal(ids.size, jobs.length);
  assert.equal(sourceJobIds.size, jobs.length);
  assert.ok(jobs.some((job) => job[10] === '机械'));
  assert.ok(jobs.some((job) => job[11] === '实习'));
  assert.ok(jobs.some((job) => job[11] === '应届生'));
  assert.ok(jobs.some((job) => job[11] === '3-5年'));
});

test('supplemental jobs provide enough state and tech preset matches', () => {
  const jobs = buildSupplementalJobs().map((job) => ({
    id: job[0],
    title: job[3],
    company: job[4],
    description: job[13],
    experience: job[11],
  }));

  const stateJobs = jobs.filter((job) => jobMatchesPreset(job, 'state'));
  const techJobs = jobs.filter((job) => jobMatchesPreset(job, 'tech'));

  assert.ok(new Set(stateJobs.map((job) => job.company)).size >= 6);
  assert.ok(new Set(techJobs.map((job) => job.company)).size >= 6);
  assert.ok(stateJobs.some((job) => job.experience === '应届生'));
  assert.ok(stateJobs.some((job) => job.experience === '实习'));
  assert.ok(techJobs.some((job) => job.experience === '应届生'));
  assert.ok(techJobs.some((job) => job.experience === '实习'));
});
