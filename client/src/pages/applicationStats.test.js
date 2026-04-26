import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApplicationViewModel } from './applicationStats.js';

test('buildApplicationViewModel deduplicates local applications by normalized job_id', () => {
  const localApplications = [
    { id: 'local-79', job_id: '79', status: 'applied', applied_at: '2026-04-25T10:00:00.000Z' },
  ];
  const remoteApplications = [
    { id: 'remote-79', job_id: 79, status: 'success', applied_at: '2026-04-25T10:01:00.000Z' },
  ];

  const result = buildApplicationViewModel({ localApplications, remoteApplications });

  assert.equal(result.applications.length, 1);
  assert.equal(result.stats.total, 1);
  assert.equal(result.stats.success, 1);
});

test('buildApplicationViewModel uses max strategy when only apiStats are available', () => {
  const localApplications = [
    { id: 'local-1', job_id: '1', status: 'applied', applied_at: '2026-04-25T10:00:00.000Z' },
    { id: 'local-2', job_id: '2', status: 'failed', applied_at: '2026-04-25T10:01:00.000Z' },
  ];
  const apiStats = { total: 1, success: 0, pending: 0, failed: 0 };

  const result = buildApplicationViewModel({
    localApplications,
    remoteApplications: [],
    apiStats,
  });

  assert.equal(result.stats.total, 2);
  assert.equal(result.stats.success, 1);
  assert.equal(result.stats.failed, 1);
});
