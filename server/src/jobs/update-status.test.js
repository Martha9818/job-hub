const assert = require('node:assert/strict');
const test = require('node:test');

const {
  UPDATE_INTERVAL_HOURS,
  deriveJobUpdateStatus,
} = require('./update-status');

test('deriveJobUpdateStatus returns 6-hour cadence from latest data update time', () => {
  const result = deriveJobUpdateStatus('2026-04-26 03:01:40');

  assert.equal(result.update_interval_hours, UPDATE_INTERVAL_HOURS);
  assert.equal(result.last_data_updated_at, '2026-04-26T03:01:40.000Z');
  assert.equal(result.next_expected_update_at, '2026-04-26T09:01:40.000Z');
});

test('deriveJobUpdateStatus gracefully handles missing update time', () => {
  const result = deriveJobUpdateStatus(null);

  assert.equal(result.update_interval_hours, UPDATE_INTERVAL_HOURS);
  assert.equal(result.last_data_updated_at, null);
  assert.equal(result.next_expected_update_at, null);
});
