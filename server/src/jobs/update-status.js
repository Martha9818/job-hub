const UPDATE_INTERVAL_HOURS = 6;

function parseDbTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const normalized = String(value).includes('T')
    ? String(value)
    : `${String(value).replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deriveJobUpdateStatus(lastUpdatedAt) {
  const lastDate = parseDbTimestamp(lastUpdatedAt);
  if (!lastDate) {
    return {
      update_interval_hours: UPDATE_INTERVAL_HOURS,
      last_data_updated_at: null,
      next_expected_update_at: null,
    };
  }

  const nextDate = new Date(lastDate.getTime() + UPDATE_INTERVAL_HOURS * 60 * 60 * 1000);
  return {
    update_interval_hours: UPDATE_INTERVAL_HOURS,
    last_data_updated_at: lastDate.toISOString(),
    next_expected_update_at: nextDate.toISOString(),
  };
}

module.exports = {
  UPDATE_INTERVAL_HOURS,
  deriveJobUpdateStatus,
};
