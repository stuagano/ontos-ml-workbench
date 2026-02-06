/**
 * TrainingJobList - Display all training jobs with status and filtering
 *
 * Pure visualization component:
 * - Fetches jobs from backend
 * - Displays in table with status badges
 * - Auto-refreshes when active jobs exist
 * - All state comes from backend
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Eye,
  StopCircle,
} from "lucide-react";
import { listTrainingJobs } from "../services/api";
import type { TrainingJob } from "../types";

interface TrainingJobListProps {
  onSelectJob: (jobId: string) => void;
  trainingSheetId?: string; // Optional: filter by training sheet
}

export function TrainingJobList({
  onSelectJob,
  trainingSheetId,
}: TrainingJobListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch jobs from backend
  const {
    data: jobs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["training-jobs", trainingSheetId, statusFilter],
    queryFn: async () => {
      const response = await listTrainingJobs({
        training_sheet_id: trainingSheetId,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 100,
      });
      return response.jobs;
    },
    refetchInterval: (query) => {
      // Auto-refresh every 5 seconds if any jobs are running
      const jobs = query.state.data || [];
      const hasActiveJobs = jobs.some(
        (job: TrainingJob) =>
          job.status === "running" || job.status === "pending",
      );
      return hasActiveJobs ? 5000 : false;
    },
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      ),
      running: (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
          <Loader2 className="w-3 h-3 animate-spin" />
          Running
        </span>
      ),
      succeeded: (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
          <CheckCircle className="w-3 h-3" />
          Succeeded
        </span>
      ),
      failed: (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      ),
      cancelled: (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
          <StopCircle className="w-3 h-3" />
          Cancelled
        </span>
      ),
    };
    return (
      badges[status as keyof typeof badges] || (
        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
          {status}
        </span>
      )
    );
  };

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Failed to Load Jobs</h3>
            <p className="text-sm text-red-600 mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-db-gray-200">
        {[
          { id: "all", label: "All Jobs" },
          { id: "running", label: "Running" },
          { id: "succeeded", label: "Succeeded" },
          { id: "failed", label: "Failed" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === tab.id
                ? "border-green-600 text-green-600"
                : "border-transparent text-db-gray-600 hover:text-db-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      {!jobs || jobs.length === 0 ? (
        <div className="text-center py-12">
          <Play className="w-12 h-12 text-db-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-db-gray-900 mb-1">
            No Training Jobs
          </h3>
          <p className="text-sm text-db-gray-600">
            {statusFilter === "all"
              ? "Create your first training job to get started"
              : `No ${statusFilter} jobs found`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-db-gray-50 border-b border-db-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-db-gray-500 uppercase tracking-wider">
                  Model Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-db-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-db-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-db-gray-500 uppercase tracking-wider">
                  Base Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-db-gray-500 uppercase tracking-wider">
                  Train / Val
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-db-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-db-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-db-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-db-gray-200">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-db-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectJob(job.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-db-gray-900">
                        {job.model_name}
                      </div>
                      {job.model_version && (
                        <span className="text-xs text-db-gray-500">
                          v{job.model_version}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">{getStatusBadge(job.status)}</td>

                  <td className="px-4 py-3">
                    {job.status === "running" || job.status === "pending" ? (
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs text-db-gray-600 mb-1">
                          <span>{job.progress_percent}%</span>
                        </div>
                        <div className="h-2 bg-db-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 transition-all duration-300"
                            style={{ width: `${job.progress_percent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-db-gray-500">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-sm text-db-gray-600">
                      {job.base_model
                        .replace("databricks-", "")
                        .replace("-instruct", "")}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-sm text-db-gray-600">
                      {job.train_pairs} / {job.val_pairs}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-sm text-db-gray-600">
                      {formatDuration(job.duration_seconds)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-sm text-db-gray-600">
                      {formatTime(job.created_at)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJob(job.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {jobs && jobs.length > 0 && (
        <div className="flex items-center justify-between text-sm text-db-gray-600 pt-2 border-t">
          <div>
            Showing {jobs.length} job{jobs.length !== 1 ? "s" : ""}
          </div>
          <button
            onClick={() => refetch()}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
