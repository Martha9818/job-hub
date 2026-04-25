const APPLIED_STATUSES = new Set(['applied', 'submitted', 'success']);
const PENDING_STATUSES = new Set(['pending', 'applying']);

export function buildApplicationViewModel({
  localApplications = [],
  remoteApplications = [],
  apiStats = null,
} = {}) {
  const remoteJobIds = new Set(remoteApplications.map(app => app.job_id).filter(Boolean));
  const localOnlyApplications = localApplications.filter(app => !remoteJobIds.has(app.job_id));
  const applications = [...localOnlyApplications, ...remoteApplications];

  const stats = applications.reduce((acc, app) => {
    acc.total += 1;
    if (APPLIED_STATUSES.has(app.status)) acc.success += 1;
    if (PENDING_STATUSES.has(app.status)) acc.pending += 1;
    if (app.status === 'failed') acc.failed += 1;
    return acc;
  }, {
    total: 0,
    success: 0,
    pending: 0,
    failed: 0,
  });

  if (apiStats && remoteApplications.length === 0) {
    return {
      applications,
      stats: {
        total: localOnlyApplications.length + (apiStats.total || 0),
        success: localOnlyApplications.length + (apiStats.success || 0),
        pending: apiStats.pending || 0,
        failed: apiStats.failed || 0,
      },
    };
  }

  return { applications, stats };
}
