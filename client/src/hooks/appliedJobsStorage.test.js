import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  APPLIED_STATUS,
  isJobApplied,
  loadAppliedJobs,
  markJobApplied,
  undoJobApplied,
} from './appliedJobsStorage.js';

test('markJobApplied creates a stable local application record', () => {
  const now = '2026-04-25T10:00:00.000Z';
  const job = {
    id: 'j79',
    title: '机械技术支持实习',
    company: '山推股份',
    location: '济宁',
    salary_text: '3K-4.5K',
    source_url: 'https://www.shantui.com',
  };

  const records = markJobApplied([], job, now);

  assert.equal(records.length, 1);
  assert.equal(records[0].id, 'local-j79');
  assert.equal(records[0].job_id, 'j79');
  assert.equal(records[0].title, job.title);
  assert.equal(records[0].company, job.company);
  assert.equal(records[0].location, job.location);
  assert.equal(records[0].salary_text, job.salary_text);
  assert.equal(records[0].source_url, job.source_url);
  assert.equal(records[0].status, APPLIED_STATUS);
  assert.equal(records[0].applied_at, now);
  assert.equal(isJobApplied(records, 'j79'), true);
});

test('markJobApplied updates existing records instead of duplicating them', () => {
  const first = markJobApplied([], { id: 'j1', title: '旧标题' }, '2026-04-25T10:00:00.000Z');
  const second = markJobApplied(first, { id: 'j1', title: '新标题', company: '新公司' }, '2026-04-25T10:05:00.000Z');

  assert.equal(second.length, 1);
  assert.equal(second[0].title, '新标题');
  assert.equal(second[0].company, '新公司');
  assert.equal(second[0].applied_at, '2026-04-25T10:05:00.000Z');
});

test('undoJobApplied removes a local application record', () => {
  const records = markJobApplied([], { id: 'j1', title: '机械设计工程师' }, '2026-04-25T10:00:00.000Z');
  const next = undoJobApplied(records, 'j1');

  assert.deepEqual(next, []);
  assert.equal(isJobApplied(next, 'j1'), false);
});

test('loadAppliedJobs returns an empty list for invalid storage content', () => {
  const storage = {
    getItem() {
      return '{broken';
    },
  };

  assert.deepEqual(loadAppliedJobs(storage), []);
});
