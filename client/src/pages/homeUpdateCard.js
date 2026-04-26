export function formatUpdateDateTime(value, timeZone = 'Asia/Shanghai') {
  if (!value) return '等待首次更新';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '等待首次更新';

  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`;
}

export function getHomeUpdateCardContent(updateStatus) {
  const intervalHours = updateStatus?.update_interval_hours || 6;
  return {
    intervalText: `每 ${intervalHours} 小时更新`,
    lastUpdatedText: formatUpdateDateTime(updateStatus?.last_data_updated_at || null),
    nextExpectedText: formatUpdateDateTime(updateStatus?.next_expected_update_at || null),
  };
}
