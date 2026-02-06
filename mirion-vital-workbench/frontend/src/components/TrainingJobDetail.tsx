/**
 * TrainingJobDetail - Detailed view of a training job with monitoring
 *
 * Pure visualization component:
 * - Fetches job data from backend
 * - Polls for status updates (backend manages state)
 * - Displays metrics, events, lineage
 * - No business logic or calculations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Play,
  XCircle,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  TrendingUp,
  GitBranch,
  Activity,
  ExternalLink,
  Ban,
} from "lucide-react";
import {
  getTrainingJob,
  pollTrainingJob,
  cancelTrainingJob,
  getTrainingJobMetrics,
  getTrainingJobEvents,
  getTrainingJobLineage,
} from "../services/api";
import { useToast } from "./Toast";
import { formatDistanceToNow } from "date-fns";
import type { TrainingJob } from "../types";

interface TrainingJobDetailProps {
  jobId: string;
  onBack: () => void;
}

export function TrainingJobDetail({ jobId, onBack }: TrainingJobDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch job details (auto-polls if running)
  const { data: job, isLoading } = useQuery({
    queryKey: ["training-job", jobId],
    queryFn: () => pollTrainingJob(jobId), // Use poll to get latest status
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return false;
      // Poll every 5s if job is active
      return job.status === 'running' || job.status === 'queued' || job.status === 'pending'
        ? 5000
        : false;
    },
  });

  // Fetch metrics (only if succeeded)
  const { data: metrics } = useQuery({
    queryKey: ["training-job-metrics", jobId],
    queryFn: () => getTrainingJobMetrics(jobId),
    enabled: job?.status === 'succeeded',
  });

  // Fetch events
  const { data: eventsData } = useQuery({
    queryKey: ["training-job-events", jobId],
    queryFn: () => getTrainingJobEvents(jobId, { page: 1, page_size: 20 }),
  });

  // Fetch lineage
  const { data: lineage } = useQuery({
    queryKey: ["training-job-lineage", jobId],
    queryFn: () => getTrainingJobLineage(jobId),
  });

  // Cancel job mutation
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelTrainingJob(jobId, reason),
    onSuccess: () => {
      toast({
        title: "Job Cancelled",
        description: "Training job has been cancelled",
      });
      queryClient.invalidateQueries({ queryKey: ["training-job", jobId] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancel Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3" />
        <p className="font-medium">Job not found</p>
      </div>
    );
  }

  const canCancel = job.status === 'pending' || job.status === 'queued' || job.status === 'running';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{job.model_name}</h2>
            <p className="text-gray-500 mt-1">
              Training Sheet: {job.training_sheet_name || job.training_sheet_id.slice(0, 8)}
            </p>
          </div>
        </div>

        {canCancel && (
          <button
            onClick={() => cancelMutation.mutate("Cancelled by user")}
            disabled={cancelMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Job"}
          </button>
        )}
      </div>

      {/* Status Card */}
      <div className={`border-2 rounded-lg p-6 ${
        job.status === 'succeeded' ? 'border-green-200 bg-green-50' :
        job.status === 'failed' ? 'border-red-200 bg-red-50' :
        job.status === 'running' ? 'border-blue-200 bg-blue-50' :
        'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {job.status === 'running' && <Loader2 className="w-6 h-6 animate-spin text-blue-600" />}
          {job.status === 'succeeded' && <CheckCircle className="w-6 h-6 text-green-600" />}
          {job.status === 'failed' && <XCircle className="w-6 h-6 text-red-600" />}
          {job.status === 'pending' && <Clock className="w-6 h-6 text-gray-600" />}
          {job.status === 'queued' && <Clock className="w-6 h-6 text-blue-600" />}
          {job.status === 'cancelled' && <AlertCircle className="w-6 h-6 text-yellow-600" />}

          <div>
            <div className="text-2xl font-bold capitalize">{job.status}</div>
            {job.current_epoch !== undefined && job.total_epochs && (
              <div className="text-sm text-gray-600">
                Epoch {job.current_epoch} of {job.total_epochs}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {(job.status === 'running' || job.status === 'queued') && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Progress</span>
              <span className="font-medium">{job.progress_percent}%</span>
            </div>
            <div className="w-full bg-white rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-500"
                style={{ width: `${job.progress_percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {job.status === 'failed' && job.error_message && (
          <div className="mt-4 p-3 bg-white border border-red-200 rounded text-sm text-red-700">
            <div className="font-medium mb-1">Error</div>
            <div>{job.error_message}</div>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Configuration
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Base Model</div>
            <div className="font-medium">{job.base_model}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Training Data</div>
            <div className="font-medium">{job.total_pairs} pairs</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Train Split</div>
            <div className="font-medium">{job.train_pairs} pairs ({Math.round(job.train_val_split * 100)}%)</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Val Split</div>
            <div className="font-medium">{job.val_pairs} pairs ({Math.round((1 - job.train_val_split) * 100)}%)</div>
          </div>
          {job.training_config.epochs && (
            <div>
              <div className="text-sm text-gray-500">Epochs</div>
              <div className="font-medium">{job.training_config.epochs}</div>
            </div>
          )}
          {job.training_config.learning_rate && (
            <div>
              <div className="text-sm text-gray-500">Learning Rate</div>
              <div className="font-medium">{job.training_config.learning_rate}</div>
            </div>
          )}
          {job.created_at && (
            <div>
              <div className="text-sm text-gray-500">Created</div>
              <div className="font-medium">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</div>
            </div>
          )}
          {job.completed_at && (
            <div>
              <div className="text-sm text-gray-500">Completed</div>
              <div className="font-medium">{formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}</div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics (if succeeded) */}
      {metrics && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Training Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.train_loss !== undefined && (
              <div>
                <div className="text-sm text-gray-500">Train Loss</div>
                <div className="text-2xl font-bold">{metrics.train_loss.toFixed(4)}</div>
              </div>
            )}
            {metrics.val_loss !== undefined && (
              <div>
                <div className="text-sm text-gray-500">Val Loss</div>
                <div className="text-2xl font-bold">{metrics.val_loss.toFixed(4)}</div>
              </div>
            )}
            {metrics.train_accuracy !== undefined && (
              <div>
                <div className="text-sm text-gray-500">Train Accuracy</div>
                <div className="text-2xl font-bold">{(metrics.train_accuracy * 100).toFixed(1)}%</div>
              </div>
            )}
            {metrics.val_accuracy !== undefined && (
              <div>
                <div className="text-sm text-gray-500">Val Accuracy</div>
                <div className="text-2xl font-bold">{(metrics.val_accuracy * 100).toFixed(1)}%</div>
              </div>
            )}
            {metrics.training_duration_seconds !== undefined && (
              <div>
                <div className="text-sm text-gray-500">Duration</div>
                <div className="text-2xl font-bold">{Math.round(metrics.training_duration_seconds / 60)}m</div>
              </div>
            )}
            {metrics.cost_dbu !== undefined && (
              <div>
                <div className="text-sm text-gray-500">Cost (DBU)</div>
                <div className="text-2xl font-bold">{metrics.cost_dbu.toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lineage */}
      {lineage && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Lineage
          </h3>
          <div className="space-y-3 text-sm">
            {lineage.sheet_name && (
              <div className="flex items-start gap-3">
                <div className="w-24 text-gray-500">Data Source:</div>
                <div className="font-medium">{lineage.sheet_name}</div>
              </div>
            )}
            {lineage.training_sheet_name && (
              <div className="flex items-start gap-3">
                <div className="w-24 text-gray-500">Training Sheet:</div>
                <div className="font-medium">{lineage.training_sheet_name}</div>
              </div>
            )}
            {lineage.template_name && (
              <div className="flex items-start gap-3">
                <div className="w-24 text-gray-500">Template:</div>
                <div className="font-medium">{lineage.template_name}</div>
              </div>
            )}
            {lineage.qa_pair_ids && lineage.qa_pair_ids.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-24 text-gray-500">Q&A Pairs:</div>
                <div className="font-medium">{lineage.qa_pair_ids.length} pairs used</div>
              </div>
            )}
            {lineage.canonical_label_ids && lineage.canonical_label_ids.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-24 text-gray-500">Canon. Labels:</div>
                <div className="font-medium">{lineage.canonical_label_ids.length} labels referenced</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events Timeline */}
      {eventsData && eventsData.events.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Event History</h3>
          <div className="space-y-3">
            {eventsData.events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{event.message || event.event_type}</div>
                  <div className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Links */}
      <div className="flex gap-3">
        {job.mlflow_run_id && (
          <a
            href={`/mlflow/#/experiments/${job.mlflow_experiment_id}/runs/${job.mlflow_run_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            View in MLflow
          </a>
        )}
        {job.fmapi_job_id && (
          <a
            href={`/fmapi/jobs/${job.fmapi_job_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            View in FMAPI
          </a>
        )}
      </div>
    </div>
  );
}
