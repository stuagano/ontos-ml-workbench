/**
 * TrainingJobDetail - Monitor job progress and show results
 *
 * Pure visualization component:
 * - Polls backend for status updates
 * - Shows real-time progress
 * - Displays metrics when complete
 * - Shows event history
 * - Displays lineage information
 * - All state from backend
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  StopCircle,
  TrendingUp,
  Database,
  GitBranch,
  ExternalLink,
  Calendar,
  Zap,
  FlaskConical,
} from "lucide-react";
import {
  getTrainingJob,
  cancelTrainingJob,
  getTrainingJobMetrics,
  getTrainingJobEvents,
  getTrainingJobLineage,
  evaluateTrainingJob,
  getJobEvaluation,
} from "../services/api";
import type { EvaluationMetric } from "../types";
import { useToast } from "./Toast";

interface TrainingJobDetailProps {
  jobId: string;
  onBack: () => void;
}

export function TrainingJobDetail({ jobId, onBack }: TrainingJobDetailProps) {
  const { success: successToast, error: errorToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "metrics" | "events" | "lineage" | "evaluate"
  >("overview");

  // Fetch job details with auto-refresh for active jobs
  const {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["training-job", jobId],
    queryFn: () => getTrainingJob(jobId),
    refetchInterval: (query) => {
      const job = query.state.data;
      return job && (job.status === "running" || job.status === "pending")
        ? 5000
        : false;
    },
  });

  // Fetch metrics (only when job is complete)
  const { data: metrics } = useQuery({
    queryKey: ["training-job-metrics", jobId],
    queryFn: () => getTrainingJobMetrics(jobId),
    enabled: job?.status === "succeeded",
  });

  // Fetch events
  const { data: events } = useQuery({
    queryKey: ["training-job-events", jobId],
    queryFn: () => getTrainingJobEvents(jobId),
    refetchInterval:
      job && (job.status === "running" || job.status === "pending")
        ? 10000
        : false,
  });

  // Fetch lineage
  const { data: lineage } = useQuery({
    queryKey: ["training-job-lineage", jobId],
    queryFn: () => getTrainingJobLineage(jobId),
  });

  // Fetch evaluation results (when job succeeded)
  const { data: evalMetrics, refetch: refetchEval } = useQuery({
    queryKey: ["training-job-eval", jobId],
    queryFn: () => getJobEvaluation(jobId),
    enabled: job?.status === "succeeded",
  });

  // Run evaluation mutation
  const runEvaluation = useMutation({
    mutationFn: () => evaluateTrainingJob(jobId),
    onSuccess: () => {
      successToast("Evaluation Complete", "Model evaluation finished");
      refetchEval();
    },
    onError: (error: any) => {
      errorToast("Evaluation Failed", error.message || "Unknown error");
    },
  });

  // Cancel job mutation
  const cancelJob = useMutation({
    mutationFn: () => cancelTrainingJob(jobId),
    onSuccess: () => {
      successToast("Job Cancelled", "Training job has been cancelled");
      queryClient.invalidateQueries({ queryKey: ["training-job", jobId] });
    },
    onError: (error: any) => {
      errorToast("Failed to Cancel", error.message || "Unknown error");
    },
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg">
          <Clock className="w-4 h-4" />
          Pending
        </span>
      ),
      running: (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          Running
        </span>
      ),
      succeeded: (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          Succeeded
        </span>
      ),
      failed: (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg">
          <XCircle className="w-4 h-4" />
          Failed
        </span>
      ),
      cancelled: (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg">
          <StopCircle className="w-4 h-4" />
          Cancelled
        </span>
      ),
    };
    return badges[status as keyof typeof badges];
  };

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0s";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600)
      return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Failed to Load Job</h3>
            <p className="text-sm text-red-600 mt-1">
              {error instanceof Error ? error.message : "Job not found"}
            </p>
            <button
              onClick={onBack}
              className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
            >
              ← Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-db-gray-600 hover:text-db-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </button>
          <h2 className="text-2xl font-bold text-db-gray-900">
            {job.model_name}
          </h2>
          {job.model_version && (
            <p className="text-sm text-db-gray-600 mt-1">
              Version {job.model_version}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(job.status)}
          {(job.status === "running" || job.status === "pending") && (
            <button
              onClick={() => cancelJob.mutate()}
              disabled={cancelJob.isPending}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <StopCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (for running jobs) */}
      {(job.status === "running" || job.status === "pending") && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              {job.status === "pending"
                ? "Waiting to start..."
                : "Training in progress..."}
            </span>
            <span className="text-sm font-medium text-blue-900">
              {job.progress_percent}%
            </span>
          </div>
          <div className="h-3 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${job.progress_percent}%` }}
            />
          </div>
          {job.current_step && (
            <p className="text-sm text-blue-700 mt-2">{job.current_step}</p>
          )}
        </div>
      )}

      {/* Error Message (for failed jobs) */}
      {job.status === "failed" && job.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-1">Error</h3>
          <p className="text-sm text-red-600">{job.error_message}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-db-gray-200">
        <div className="flex gap-1">
          {[
            { id: "overview", label: "Overview", icon: Database },
            {
              id: "metrics",
              label: "Metrics",
              icon: TrendingUp,
              disabled: job.status !== "succeeded",
            },
            { id: "events", label: "Events", icon: Calendar },
            { id: "lineage", label: "Lineage", icon: GitBranch },
            {
              id: "evaluate",
              label: "Evaluate",
              icon: FlaskConical,
              disabled: job.status !== "succeeded",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
              disabled={tab.disabled}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === tab.id
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-db-gray-600 hover:text-db-gray-900"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Configuration */}
            <div className="bg-white border border-db-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-db-gray-900 mb-4">
                Configuration
              </h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-db-gray-500">Base Model</dt>
                  <dd className="mt-1 text-sm font-medium text-db-gray-900">
                    {job.base_model}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-db-gray-500">Training Sheet</dt>
                  <dd className="mt-1 text-sm font-medium text-db-gray-900">
                    {job.training_sheet_id.slice(0, 8)}...
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-db-gray-500">Train Pairs</dt>
                  <dd className="mt-1 text-sm font-medium text-db-gray-900">
                    {job.train_pairs}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-db-gray-500">Validation Pairs</dt>
                  <dd className="mt-1 text-sm font-medium text-db-gray-900">
                    {job.val_pairs}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-db-gray-500">Duration</dt>
                  <dd className="mt-1 text-sm font-medium text-db-gray-900">
                    {formatDuration(job.duration_seconds ?? null)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-db-gray-500">Created</dt>
                  <dd className="mt-1 text-sm font-medium text-db-gray-900">
                    {formatTimestamp(job.created_at ?? "")}
                  </dd>
                </div>
              </dl>

              {/* Training Config */}
              {job.training_config && (
                <div className="mt-4 pt-4 border-t border-db-gray-200">
                  <h4 className="text-sm font-medium text-db-gray-700 mb-2">
                    Hyperparameters
                  </h4>
                  <dl className="grid grid-cols-3 gap-4">
                    {Object.entries(job.training_config).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs text-db-gray-500">{key}</dt>
                        <dd className="mt-1 text-sm font-mono text-db-gray-900">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {/* External Links */}
            {(job.mlflow_run_id || job.fmapi_job_id || job.uc_model_name) && (
              <div className="bg-white border border-db-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-db-gray-900 mb-4">
                  External Resources
                </h3>
                <div className="space-y-3">
                  {job.mlflow_run_id && (
                    <a
                      href={`/mlflow/#/experiments/runs/${job.mlflow_run_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-db-gray-200 rounded-lg hover:bg-db-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-db-gray-900">
                            MLflow Run
                          </div>
                          <div className="text-xs text-db-gray-500">
                            {job.mlflow_run_id}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-db-gray-400" />
                    </a>
                  )}

                  {job.fmapi_job_id && (
                    <a
                      href={`/foundation-model-api/jobs/${job.fmapi_job_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-db-gray-200 rounded-lg hover:bg-db-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-yellow-600" />
                        <div>
                          <div className="text-sm font-medium text-db-gray-900">
                            FMAPI Job
                          </div>
                          <div className="text-xs text-db-gray-500">
                            {job.fmapi_job_id}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-db-gray-400" />
                    </a>
                  )}

                  {job.uc_model_name && (
                    <div className="p-3 border border-db-gray-200 rounded-lg bg-db-gray-50">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-db-gray-900">
                            Unity Catalog Model
                          </div>
                          <div className="text-xs text-db-gray-500 font-mono">
                            {job.uc_model_name}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && metrics && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {metrics.final_train_loss != null && (
                <div className="bg-white border border-db-gray-200 rounded-lg p-4">
                  <div className="text-sm text-db-gray-500 mb-1">
                    Final Train Loss
                  </div>
                  <div className="text-2xl font-bold text-db-gray-900">
                    {metrics.final_train_loss.toFixed(4)}
                  </div>
                </div>
              )}
              {metrics.final_val_loss != null && (
                <div className="bg-white border border-db-gray-200 rounded-lg p-4">
                  <div className="text-sm text-db-gray-500 mb-1">
                    Final Val Loss
                  </div>
                  <div className="text-2xl font-bold text-db-gray-900">
                    {metrics.final_val_loss.toFixed(4)}
                  </div>
                </div>
              )}
              {metrics.best_val_accuracy != null && (
                <div className="bg-white border border-db-gray-200 rounded-lg p-4">
                  <div className="text-sm text-db-gray-500 mb-1">
                    Best Accuracy
                  </div>
                  <div className="text-2xl font-bold text-db-gray-900">
                    {(metrics.best_val_accuracy * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            {/* Additional metrics */}
            {metrics.metrics_json && (
              <div className="bg-white border border-db-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-db-gray-900 mb-3">
                  Additional Metrics
                </h3>
                <pre className="text-xs bg-db-gray-50 p-3 rounded overflow-x-auto">
                  {JSON.stringify(metrics.metrics_json, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="space-y-2">
            {!events?.events || events.events.length === 0 ? (
              <div className="text-center py-8 text-db-gray-500">
                No events recorded
              </div>
            ) : (
              events.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-white border border-db-gray-200 rounded-lg"
                >
                  <Calendar className="w-4 h-4 text-db-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-db-gray-900">
                        {event.event_type}
                      </span>
                      <span className="text-xs text-db-gray-500">
                        {formatTimestamp(event.created_at)}
                      </span>
                    </div>
                    {event.message && (
                      <p className="text-sm text-db-gray-600">
                        {event.message}
                      </p>
                    )}
                    {event.event_data && (
                      <details className="mt-2">
                        <summary className="text-xs text-db-gray-500 cursor-pointer">
                          Details
                        </summary>
                        <pre className="text-xs bg-db-gray-50 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Lineage Tab */}
        {activeTab === "lineage" && lineage && (
          <div className="space-y-4">
            <div className="bg-white border border-db-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-db-gray-900 mb-4">
                Data Lineage
              </h3>
              <div className="space-y-3">
                {/* Sheet */}
                {lineage.sheet && (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Database className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-db-gray-900">
                        Sheet
                      </div>
                      <div className="text-xs text-db-gray-500">
                        {lineage.sheet.name || lineage.sheet.id}
                      </div>
                    </div>
                  </div>
                )}

                {/* Arrow */}
                <div className="ml-4 border-l-2 border-db-gray-300 h-4" />

                {/* Training Sheet */}
                {lineage.training_sheet && (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-db-gray-900">
                        Training Sheet
                      </div>
                      <div className="text-xs text-db-gray-500">
                        {lineage.training_sheet.id.slice(0, 16)}...
                      </div>
                    </div>
                  </div>
                )}

                {/* Arrow */}
                <div className="ml-4 border-l-2 border-db-gray-300 h-4" />

                {/* Model */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-db-gray-900">
                      Model
                    </div>
                    <div className="text-xs text-db-gray-500">
                      {job.model_name}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Info */}
            {lineage.template && (
              <div className="bg-white border border-db-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-db-gray-900 mb-2">
                  Template Used
                </h3>
                <div className="text-sm text-db-gray-600">
                  <div className="font-medium">{lineage.template.name}</div>
                  {lineage.template.label_type && (
                    <div className="text-xs text-db-gray-500 mt-1">
                      Label Type: {lineage.template.label_type}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Evaluate Tab */}
        {activeTab === "evaluate" && (
          <div className="space-y-4">
            {/* Run Evaluation Button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-db-gray-900">
                  Model Evaluation
                </h3>
                <p className="text-sm text-db-gray-500 mt-1">
                  Run mlflow.evaluate() against validation Q&A pairs
                </p>
              </div>
              <button
                onClick={() => runEvaluation.mutate()}
                disabled={runEvaluation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {runEvaluation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FlaskConical className="w-4 h-4" />
                )}
                {runEvaluation.isPending ? "Evaluating..." : "Run Evaluation"}
              </button>
            </div>

            {/* Evaluation Results */}
            {evalMetrics && evalMetrics.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {evalMetrics.map((metric: EvaluationMetric) => (
                  <div
                    key={metric.metric_name}
                    className="bg-white border border-db-gray-200 rounded-lg p-4"
                  >
                    <div className="text-sm text-db-gray-500 mb-1">
                      {metric.metric_name.replace(/_/g, " ")}
                    </div>
                    <div className="text-2xl font-bold text-db-gray-900">
                      {metric.metric_value < 1 && metric.metric_value >= 0
                        ? `${(metric.metric_value * 100).toFixed(1)}%`
                        : metric.metric_value.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-db-gray-500 bg-white border border-db-gray-200 rounded-lg">
                <FlaskConical className="w-8 h-8 mx-auto mb-2 text-db-gray-300" />
                <p>No evaluation results yet</p>
                <p className="text-xs mt-1">
                  Click "Run Evaluation" to evaluate this model
                </p>
              </div>
            )}

            {/* MLflow Link */}
            {runEvaluation.data?.mlflow_run_id && (
              <div className="bg-white border border-db-gray-200 rounded-lg p-4">
                <a
                  href={`/mlflow/#/experiments/runs/${runEvaluation.data.mlflow_run_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  View evaluation run in MLflow
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
