export const APPLIED_STORAGE_KEY = 'jobhub_applied_jobs';
export const APPLIED_STATUS = 'applied';

function getStorage(storage) {
  if (storage) return storage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

export function loadAppliedJobs(storage) {
  const target = getStorage(storage);
  if (!target) return [];

  try {
    const parsed = JSON.parse(target.getItem(APPLIED_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAppliedJobs(records, storage) {
  const target = getStorage(storage);
  if (!target) return;
  target.setItem(APPLIED_STORAGE_KEY, JSON.stringify(records));
}

export function isJobApplied(records, jobId) {
  return records.some(record => record.job_id === jobId);
}

export function markJobApplied(records, job, appliedAt = new Date().toISOString()) {
  const record = {
    id: `local-${job.id}`,
    job_id: job.id,
    title: job.title || '',
    company: job.company || '',
    location: job.location || '',
    salary_text: job.salary_text || '',
    source_url: job.source_url || '',
    resume_name: '本地标记',
    status: APPLIED_STATUS,
    applied_at: appliedAt,
    local: true,
  };

  return [
    record,
    ...records.filter(existing => existing.job_id !== job.id),
  ];
}

export function undoJobApplied(records, jobId) {
  return records.filter(record => record.job_id !== jobId);
}
