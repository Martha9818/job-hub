const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const detail = fs.readFileSync(path.join(__dirname, 'JobDetailPage.jsx'), 'utf8');
const applications = fs.readFileSync(path.join(__dirname, 'ApplicationsPage.jsx'), 'utf8');
const jobs = fs.readFileSync(path.join(__dirname, 'JobsPage.jsx'), 'utf8');
const campus = fs.readFileSync(path.join(__dirname, 'CampusPage.jsx'), 'utf8');

test('JobDetailPage separates opening source page from marking applied', () => {
  assert.match(detail, /useAppliedJobs/);
  assert.match(detail, /markApplied\(job\)/);
  assert.match(detail, /undoApplied\(job\.id\)/);
  assert.match(detail, /打开招聘页|打开原始招聘页/);
  assert.match(detail, /标记已投递/);
  assert.equal((detail.match(/href=\{job\.source_url\}/g) || []).length, 1);
});

test('ApplicationsPage includes local applied job records', () => {
  assert.match(applications, /useAppliedJobs/);
  assert.match(applications, /localApplications/);
  assert.match(applications, /投递时间|applied_at/);
});

test('job list pages show applied badges', () => {
  assert.match(jobs, /useAppliedJobs/);
  assert.match(jobs, /isApplied\(job\.id\)/);
  assert.match(campus, /useAppliedJobs/);
  assert.match(campus, /isApplied\(job\.id\)/);
  assert.match(`${jobs}\n${campus}`, /已投递/);
});
