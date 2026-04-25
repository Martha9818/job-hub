import { useCallback, useEffect, useState } from 'react';
import {
  isJobApplied,
  loadAppliedJobs,
  markJobApplied,
  saveAppliedJobs,
  undoJobApplied,
} from './appliedJobsStorage';

export function useAppliedJobs() {
  const [localApplications, setLocalApplications] = useState(loadAppliedJobs);

  useEffect(() => {
    saveAppliedJobs(localApplications);
  }, [localApplications]);

  const markApplied = useCallback((job) => {
    setLocalApplications(prev => markJobApplied(prev, job));
  }, []);

  const undoApplied = useCallback((jobId) => {
    setLocalApplications(prev => undoJobApplied(prev, jobId));
  }, []);

  const isApplied = useCallback((jobId) => {
    return isJobApplied(localApplications, jobId);
  }, [localApplications]);

  return { localApplications, markApplied, undoApplied, isApplied };
}
