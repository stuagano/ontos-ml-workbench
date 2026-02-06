/**
 * TrainingJobList - Display list of training jobs with status
 *
 * Pure visualization component:
 * - Fetches jobs from backend
 * - Displays job data
 * - No calculations or business logic
 * - All state comes from backend
 */

import { useQuery } from "@tanstack/react-query";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { listTrainingJobs } from "../services/api";
import { formatDistanceToNow } from "date-fns";
import type { TrainingJob, TrainingJobStatus } from "../types";

interface TrainingJobListProps {
  trainingSheetId?: string;
  onSelectJob?: (jobId: string) => void;
}

const STATUS_CONFIG: Record<TrainingJobStatus, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  pending: {
    icon: Clock,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "Pending",
  },
  queued: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Queued",
  },
  running: {
    icon: Loader2,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Running",
  },
  succeeded: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Succeeded",
  },
  failed: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Failed",
  },
  cancelled: {
    icon: AlertCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Cancelled",
  },
  timeout: {
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "Timeout",
  },
};

function StatusBadge({ status }: { status: TrainingJobStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgColor}`}>
      <Icon className={`w-4 h-4 ${config.color} ${status === 'running' ? 'animate-spin' : ''}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className="bg-blue-600 h-full transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function TrainingJobList({ trainingSheetId, onSelectJob }: TrainingJobListProps) {
  // Fetch jobs from backend (backend is source of truth)
  const { data, isLoading, error } = useQuery({
    queryKey: ["training-jobs", trainingSheetId],
    queryFn: () => listTrainingJobs({
      training_sheet_id: trainingSheetId,
      page: 1,
      page_size: 50,
    }),
    refetchInterval: (query) => {
      // Auto-refresh if there are running jobs
      const jobs = query.state.data?.jobs || [];
      const hasActiveJobs = jobs.some(j =>
        j.status === 'running' || j.status === 'queued' || j.status === 'pending'
      );
      return hasActiveJobs ? 5000 : false; // Poll every 5s if active jobs
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>Failed to load training jobs</span>
      </div>
    );
  }

  const jobs = data?.jobs || [];

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No training jobs yet</p>
        <p className="text-sm mt-1">Create your first training job to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer"
          onClick={() => onSelectJob?.(job.id)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {job.model_name}
                </h3>
                <StatusBadge status={job.status} />
              </div>
              <p className="text-sm text-gray-500 truncate">
                {job.training_sheet_name || `Training Sheet ${job.training_sheet_id.slice(0, 8)}`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
          </div>

          {/* Progress Bar (only for running jobs) */}
          {(job.status === 'running' || job.status === 'queued') && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>
                  {job.current_epoch !== undefined && job.total_epochs
                    ? `Epoch ${job.current_epoch}/${job.total_epochs}`
                    : 'Training...'}
                </span>
                <span>{job.progress_percent}%</span>
              </div>
              <ProgressBar percent={job.progress_percent} />
            </div>
          )}

          {/* Job Details */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Base Model</div>
              <div className="font-medium text-gray-900 truncate" title={job.base_model}>
                {job.base_model.split('-').pop() || job.base_model}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Training Data</div>
              <div className="font-medium text-gray-900">
                {job.train_pairs} / {job.val_pairs} split
              </div>
            </div>
            <div>
              <div className="text-gray-500">
                {job.status === 'succeeded' ? 'Completed' :
                 job.status === 'failed' ? 'Failed' :
                 job.status === 'cancelled' ? 'Cancelled' :
                 'Started'}
              </div>
              <div className="font-medium text-gray-900">
                {job.completed_at
                  ? formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })
                  : job.started_at
                  ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true })
                  : job.created_at
                  ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true })
                  : '-'}
              </div>
            </div>
          </div>

          {/* Error Message (if failed) */}
          {job.status === 'failed' && job.error_message && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="break-words">{job.error_message}</span>
              </div>
            </div>
          )}

          {/* MLflow Link (if available) */}
          {job.mlflow_run_id && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <a
                href={`/mlflow/#/experiments/${job.mlflow_experiment_id}/runs/${job.mlflow_run_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
                View in MLflow
              </a>
            </div>
          )}
        </div>
      ))}

      {/* Pagination Info */}
      {data && data.total > data.jobs.length && (
        <div className="text-center pt-4 text-sm text-gray-500">
          Showing {data.jobs.length} of {data.total} jobs
        </div>
      )}
    </div>
  );
}
