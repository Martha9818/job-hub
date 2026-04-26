const APPLIED_STATUSES = new Set(['applied', 'submitted', 'success']);
const PENDING_STATUSES = new Set(['pending', 'applying']);

function normalizeJobId(jobId) {
  if (jobId === null || jobId === undefined) return '';
  return String(jobId);
}

function createEmptyStats() {
  return {
    total: 0,
    success: 0,
    pending: 0,
    failed: 0,
  };
}

function buildStats(applications = []) {
  return applications.reduce((acc, app) => {
    acc.total += 1;
    if (APPLIED_STATUSES.has(app.status)) acc.success += 1;
    if (PENDING_STATUSES.has(app.status)) acc.pending += 1;
    if (app.status === 'failed') acc.failed += 1;
    return acc;
  }, createEmptyStats());
}

export function buildApplicationViewModel({
  localApplications = [],
  remoteApplications = [],
  apiStats = null,
} = {}) {
  const remoteJobIds = new Set(
    remoteApplications
      .map((app) => normalizeJobId(app.job_id))
      .filter(Boolean)
  );

  const localOnlyApplications = localApplications.filter((app) => !remoteJobIds.has(normalizeJobId(app.job_id)));
  const applications = [...localOnlyApplications, ...remoteApplications]
    .sort((a, b) => new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime());

  const derivedStats = buildStats(applications);

  if (apiStats && remoteApplications.length === 0) {
    // When remote list is unavailable, avoid over-counting by taking the safer upper bound per metric.
    const localStats = buildStats(localApplications);
    return {
      applications,
      stats: {
        total: Math.max(Number(apiStats.total) || 0, localStats.total),
        success: Math.max(Number(apiStats.success) || 0, localStats.success),
        pending: Math.max(Number(apiStats.pending) || 0, localStats.pending),
        failed: Math.max(Number(apiStats.failed) || 0, localStats.failed),
      },
    };
  }

  return { applications, stats: derivedStats };
}

