function fallbackSearchUrl(query) {
  const normalized = String(query || '机械 招聘').trim() || '机械 招聘';
  return `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(normalized)}`;
}

function normalizeExternalUrl(rawUrl, options = {}) {
  const { baseUrl = '', fallbackQuery = '' } = options;
  const raw = String(rawUrl || '').trim();

  if (!raw) return fallbackSearchUrl(fallbackQuery);

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {}

  if (raw.startsWith('//')) {
    try {
      return new URL(`https:${raw}`).href;
    } catch {}
  }

  if (raw.startsWith('/') && baseUrl) {
    try {
      return new URL(raw, baseUrl).href;
    } catch {}
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) {
    try {
      return new URL(`https://${raw}`).href;
    } catch {}
  }

  return fallbackSearchUrl(fallbackQuery || raw);
}

module.exports = { normalizeExternalUrl };
