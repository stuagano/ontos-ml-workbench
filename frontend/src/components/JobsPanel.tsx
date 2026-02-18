/**
 * JobsPanel - Shows active and recent job runs
 */

import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';
import { listJobRuns } from '../services/api';
import { databricksLinks, openInDatabricks } from '../services/databricksLinks';
import type { JobRun, JobStatus } from '../types';

const statusConfig: Record<JobStatus, { icon: typeof Loader2; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-gray-500', label: 'Pending' },
  running: { icon: Loader2, color: 'text-blue-500', label: 'Running' },
  succeeded: { icon: CheckCircle2, color: 'text-green-500', label: 'Succeeded' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-gray-400', label: 'Cancelled' },
};

function JobRunItem({ job }: { job: JobRun }) {
  const config = statusConfig[job.status];
  const Icon = config.icon;
  const isRunning = job.status === 'running';

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-db-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon
          className={clsx(
            'w-4 h-4',
            config.color,
            isRunning && 'animate-spin'
          )}
        />
        <div>
          <div className="text-sm font-medium text-db-gray-800">
            {job.job_name || job.job_type}
          </div>
          <div className="text-xs text-db-gray-500">
            {job.created_at ? new Date(job.created_at).toLocaleTimeString() : ''}
          </div>
        </div>
      </div>

      {job.databricks_run_id && (
        <button
          onClick={() => openInDatabricks(databricksLinks.jobs())}
          className="p-1 text-db-gray-400 hover:text-db-gray-600"
          title="View in Databricks"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface JobsPanelProps {
  templateId?: string;
  className?: string;
}

export function JobsPanel({ templateId, className }: JobsPanelProps) {
  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ['jobs', templateId],
    queryFn: () => listJobRuns({ template_id: templateId, limit: 10 }),
    refetchInterval: 5000, // Poll every 5s for running jobs
  });

  const activeJobs = jobs?.filter(j => j.status === 'running' || j.status === 'pending') || [];
  const recentJobs = jobs?.filter(j => j.status !== 'running' && j.status !== 'pending').slice(0, 5) || [];

  return (
    <div className={clsx('bg-white rounded-lg border border-db-gray-200 p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-db-gray-800">Jobs</h3>
        <button
          onClick={() => refetch()}
          className="p-1 text-db-gray-400 hover:text-db-gray-600 rounded"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-db-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeJobs.length > 0 && (
            <div>
              <div className="text-xs font-medium text-db-gray-500 uppercase mb-2">
                Active
              </div>
              <div className="space-y-1">
                {activeJobs.map(job => (
                  <JobRunItem key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}

          {recentJobs.length > 0 && (
            <div>
              <div className="text-xs font-medium text-db-gray-500 uppercase mb-2">
                Recent
              </div>
              <div className="space-y-1">
                {recentJobs.map(job => (
                  <JobRunItem key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}

          {activeJobs.length === 0 && recentJobs.length === 0 && (
            <div className="text-center py-8 text-db-gray-400 text-sm">
              No jobs yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
