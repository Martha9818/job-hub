const assert = require('node:assert/strict');
const { before, test } = require('node:test');

let buildApplicationViewModel;

before(async () => {
  ({ buildApplicationViewModel } = await import('./applicationStats.js'));
});

test('buildApplicationViewModel does not mutate api stats across re-renders', () => {
  const apiStats = { total: 24, success: 0, pending: 24, failed: 0 };
  const localApplications = [{ id: 'local-j79', job_id: 'j79', status: 'applied' }];
  const remoteApplications = Array.from({ length: 24 }, (_, index) => ({
    id: `remote-${index}`,
    job_id: `j${index}`,
    status: 'submitted',
  }));

  const first = buildApplicationViewModel({ localApplications, remoteApplications, apiStats });
  const second = buildApplicationViewModel({ localApplications, remoteApplications, apiStats });

  assert.deepEqual(apiStats, { total: 24, success: 0, pending: 24, failed: 0 });
  assert.deepEqual(first.stats, second.stats);
  assert.equal(first.stats.total, 25);
  assert.equal(second.stats.total, 25);
});

test('buildApplicationViewModel does not double count local records already returned by api', () => {
  const localApplications = [{ id: 'local-j79', job_id: 'j79', status: 'applied' }];
  const remoteApplications = [{ id: 'remote-j79', job_id: 'j79', status: 'submitted' }];

  const model = buildApplicationViewModel({ localApplications, remoteApplications, apiStats: null });

  assert.equal(model.applications.length, 1);
  assert.equal(model.stats.total, 1);
});
