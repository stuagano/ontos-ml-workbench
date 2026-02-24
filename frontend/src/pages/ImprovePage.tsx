/**
 * ImprovePage - IMPROVE stage for collecting feedback and continuous improvement
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Loader2,
  Target,
  BarChart3,
  Eye,
  CheckCircle2,
  Play,
  ClipboardList,
  X,
} from "lucide-react";
import { DataTable, Column, RowAction } from "../components/DataTable";
import { StatsCard } from "../components/StatsCard";
import { WorkflowBanner } from "../components/WorkflowBanner";
import { ExampleEffectivenessDashboard } from "./ExampleEffectivenessDashboard";
import { clsx } from "clsx";
import {
  listEndpoints,
  listFeedback,
  getFeedbackStats,
  listGaps,
  convertFeedbackToCuration,
  listTemplates,
  createGapTask,
  listTrainingSheets,
  createTrainingJob,
} from "../services/api";
import { useToast } from "../components/Toast";
import type { FeedbackItem, Gap } from "../services/api";

// ============================================================================
// GapCard Component
// ============================================================================

interface GapCardProps {
  gap: Gap;
  onCreateTask?: (gapId: string) => void;
  isCreatingTask?: boolean;
}

function GapCard({ gap, onCreateTask, isCreatingTask }: GapCardProps) {
  const severityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div
      className={clsx("rounded-lg border p-3", severityColors[gap.severity])}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">{gap.category}</span>
        <span className="text-xs">{gap.occurrence_count} occurrences</span>
      </div>
      <p className="text-sm opacity-90">{gap.description}</p>
      {gap.suggested_action && (
        <p className="text-xs mt-2 opacity-75">
          Action: {gap.suggested_action}
        </p>
      )}
      {onCreateTask && gap.status !== "task_created" && gap.status !== "resolved" && (
        <button
          onClick={() => onCreateTask(gap.id)}
          disabled={isCreatingTask}
          className="mt-2 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-white/60 hover:bg-white/80 transition-colors"
        >
          <ClipboardList className="w-3 h-3" />
          Create Annotation Task
        </button>
      )}
      {gap.status === "task_created" && (
        <span className="mt-2 inline-flex items-center gap-1 text-xs opacity-75">
          <CheckCircle2 className="w-3 h-3" /> Task created
        </span>
      )}
    </div>
  );
}

// StatsCard component moved to /frontend/src/components/StatsCard.tsx

// ============================================================================
// ImprovePage Component
// ============================================================================

// ============================================================================
// Example Browser Modal - Unified browse examples + add new
// ============================================================================


// ============================================================================
// Main Component
// ============================================================================

type ImproveView = "feedback" | "effectiveness";

interface ImprovePageProps {
  mode?: "browse" | "create";
  onModeChange?: (mode: "browse" | "create") => void;
}

export function ImprovePage({ mode = "browse", onModeChange }: ImprovePageProps) {
  const [view, setView] = useState<ImproveView>("feedback");
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    null,
  );
  const [ratingFilter, setRatingFilter] = useState<
    "all" | "positive" | "negative"
  >("all");
  const [feedbackToConvert, setFeedbackToConvert] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch endpoints
  const { data: endpoints, isLoading: endpointsLoading } = useQuery({
    queryKey: ["endpoints"],
    queryFn: () => listEndpoints(),
  });

  // Fetch feedback
  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ["feedback", selectedEndpointId, ratingFilter],
    queryFn: () =>
      listFeedback({
        endpoint_id: selectedEndpointId || undefined,
        rating: ratingFilter === "all" ? undefined : ratingFilter,
        page_size: 20,
      }),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["feedbackStats", selectedEndpointId],
    queryFn: () =>
      getFeedbackStats({
        endpoint_id: selectedEndpointId || undefined,
        days: 30,
      }),
  });

  // Fetch gaps
  const { data: gapsData } = useQuery({
    queryKey: ["gaps"],
    queryFn: () => listGaps({ page_size: 10 }),
  });

  // Fetch templates for converting feedback
  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => listTemplates(),
  });

  // Fetch training sheets for retrain modal
  const { data: trainingSheets = [] } = useQuery({
    queryKey: ["training-sheets"],
    queryFn: () => listTrainingSheets({ status: "approved", limit: 50 }),
  });

  // Retrain state
  const [showRetrain, setShowRetrain] = useState(false);
  const [retrainSheetId, setRetrainSheetId] = useState("");
  const [retrainModelName, setRetrainModelName] = useState("");

  // Create annotation task from gap
  const gapTaskMutation = useMutation({
    mutationFn: (gapId: string) => createGapTask(gapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gaps"] });
      toast.success("Task Created", "Annotation task created from gap");
    },
    onError: (error: Error) => {
      toast.error("Failed to create task", error.message);
    },
  });

  // Trigger retrain
  const retrainMutation = useMutation({
    mutationFn: () =>
      createTrainingJob({
        training_sheet_id: retrainSheetId,
        model_name: retrainModelName,
        base_model: "databricks-meta-llama-3-1-70b-instruct",
        training_config: { epochs: 3, learning_rate: 0.0001, batch_size: 4 },
        train_val_split: 0.8,
        register_to_uc: true,
      }),
    onSuccess: (data) => {
      toast.success("Retraining Started", `Job ${data.id} is now queued. Monitor progress in the TRAIN stage.`);
      setShowRetrain(false);
      setRetrainSheetId("");
      setRetrainModelName("");
    },
    onError: (error: Error) => {
      toast.error("Retrain Failed", error.message);
    },
  });

  // Convert feedback to curation mutation
  const convertMutation = useMutation({
    mutationFn: ({
      feedbackId,
      templateId,
    }: {
      feedbackId: string;
      templateId: string;
    }) => convertFeedbackToCuration(feedbackId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast.success(
        "Added to training data",
        "Item is now in the curation queue",
      );
    },
    onError: (error) => {
      toast.error("Failed to convert feedback", error.message);
    },
  });

  const readyEndpoints = endpoints || [];
  const feedbackItems = feedbackData?.items || [];
  const gaps = gapsData?.gaps || [];
  const templates = templatesData?.templates || [];

  const handleAddToTraining = (feedbackId: string) => {
    if (templates.length === 0) {
      toast.error("No templates", "Create a template first in Prompt Templates (Alt+T).");
      return;
    }
    if (templates.length === 1) {
      convertMutation.mutate({ feedbackId, templateId: templates[0].id });
      return;
    }
    // Multiple templates — show picker
    setFeedbackToConvert(feedbackId);
  };

  const isLoading = endpointsLoading || feedbackLoading;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Workflow Banner */}
        <WorkflowBanner stage="improve" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-db-gray-900">Improve</h1>
            <p className="text-db-gray-600 mt-1">
              Collect feedback, identify gaps, and continuously improve
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-db-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setView("feedback")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                  view === "feedback"
                    ? "bg-white text-db-gray-800 shadow-sm"
                    : "text-db-gray-500 hover:text-db-gray-700"
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Feedback
              </button>
              <button
                onClick={() => setView("effectiveness")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                  view === "effectiveness"
                    ? "bg-white text-db-gray-800 shadow-sm"
                    : "text-db-gray-500 hover:text-db-gray-700"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                Effectiveness
              </button>
            </div>
            {view === "feedback" && (
              <select
                value={selectedEndpointId || ""}
                onChange={(e) => setSelectedEndpointId(e.target.value || null)}
                className="px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">All Endpoints</option>
                {readyEndpoints.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* View content */}
        {view === "effectiveness" ? (
          <ExampleEffectivenessDashboard />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-db-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total Feedback"
                value={stats?.total_count || 0}
                subtitle="Last 30 days"
                icon={MessageSquare}
                color="text-db-gray-600"
              />
              <StatsCard
                title="Positive"
                value={
                  stats ? `${Math.round(stats.positive_rate * 100)}%` : "0%"
                }
                subtitle={`${stats?.positive_count || 0} responses`}
                icon={ThumbsUp}
                color="text-green-600"
              />
              <StatsCard
                title="Negative"
                value={
                  stats
                    ? `${Math.round((1 - stats.positive_rate) * 100)}%`
                    : "0%"
                }
                subtitle={`${stats?.negative_count || 0} responses`}
                icon={ThumbsDown}
                color="text-red-600"
              />
              <StatsCard
                title="Gaps Identified"
                value={gapsData?.total || 0}
                subtitle={`${gaps.filter((g) => g.severity === "high").length} high priority`}
                icon={Target}
                color="text-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Recent feedback - now with DataTable */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-db-gray-800">
                    Recent Feedback
                  </h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={ratingFilter}
                      onChange={(e) =>
                        setRatingFilter(
                          e.target.value as "all" | "positive" | "negative",
                        )
                      }
                      className="text-sm px-2 py-1 border border-db-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">All ratings</option>
                      <option value="positive">Positive only</option>
                      <option value="negative">Negative only</option>
                    </select>
                  </div>
                </div>

                {(() => {
                  // Define table columns for feedback
                  const columns: Column<FeedbackItem>[] = [
                    {
                      key: "rating",
                      header: "Rating",
                      width: "10%",
                      render: (item) =>
                        item.rating === "positive" ? (
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <ThumbsDown className="w-4 h-4 text-red-600" />
                        ),
                    },
                    {
                      key: "endpoint",
                      header: "Endpoint",
                      width: "20%",
                      render: (item) => (
                        <span className="text-sm text-db-gray-900 truncate">
                          {item.endpoint_id || "N/A"}
                        </span>
                      ),
                    },
                    {
                      key: "input",
                      header: "Input",
                      width: "35%",
                      render: (item) => (
                        <span className="text-sm text-db-gray-600 truncate">
                          {item.input_text?.slice(0, 100) || "No input"}...
                        </span>
                      ),
                    },
                    {
                      key: "comment",
                      header: "Comment",
                      width: "25%",
                      render: (item) => (
                        <span className="text-sm text-db-gray-500 truncate">
                          {item.feedback_text || "No comment"}
                        </span>
                      ),
                    },
                    {
                      key: "time",
                      header: "Time",
                      width: "10%",
                      render: (item) => (
                        <span className="text-sm text-db-gray-500">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : "N/A"}
                        </span>
                      ),
                    },
                  ];

                  // Define row actions
                  const rowActions: RowAction<FeedbackItem>[] = [
                    {
                      label: "Add to Training",
                      icon: CheckCircle2,
                      onClick: (item) => handleAddToTraining(item.id),
                      className: "text-indigo-600",
                    },
                    {
                      label: "View Details",
                      icon: Eye,
                      onClick: (item) => {
                        toast.info("View Details", `Feedback ID: ${item.id}`);
                      },
                    },
                  ];

                  const emptyState = (
                    <div className="bg-white rounded-lg border border-db-gray-200 p-8 text-center">
                      <MessageSquare className="w-10 h-10 text-db-gray-300 mx-auto mb-3" />
                      <p className="text-db-gray-500">No feedback yet</p>
                      <p className="text-sm text-db-gray-400 mt-1">
                        Feedback will appear here as users rate responses
                      </p>
                    </div>
                  );

                  return (
                    <DataTable
                      data={feedbackItems}
                      columns={columns}
                      rowKey={(item) => item.id}
                      rowActions={rowActions}
                      emptyState={emptyState}
                    />
                  );
                })()}
              </div>

              {/* Gap analysis */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-db-gray-800">
                    Gap Analysis
                  </h2>
                  <button className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                    <RefreshCw className="w-3 h-3" />
                    Run analysis
                  </button>
                </div>

                {gaps.length === 0 ? (
                  <div className="bg-white rounded-lg border border-db-gray-200 p-8 text-center">
                    <Target className="w-10 h-10 text-db-gray-300 mx-auto mb-3" />
                    <p className="text-db-gray-500">No gaps identified</p>
                    <p className="text-sm text-db-gray-400 mt-1">
                      Run gap analysis after collecting feedback
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gaps.map((gap) => (
                      <GapCard
                        key={gap.id}
                        gap={gap}
                        onCreateTask={(gapId) => gapTaskMutation.mutate(gapId)}
                        isCreatingTask={gapTaskMutation.isPending}
                      />
                    ))}
                  </div>
                )}

                {/* Improvement actions */}
                <div className="mt-6 bg-indigo-50 rounded-lg p-4">
                  <h3 className="font-medium text-indigo-800 mb-3">
                    Improvement Workflow
                  </h3>
                  <div className="space-y-3 text-sm text-indigo-700">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <span>
                        Review negative feedback and add to training data
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <span>Run gap analysis to identify patterns</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <span>Curate new training data in CURATE stage</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold">
                        4
                      </div>
                      <span>Retrain model in TRAIN stage</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRetrain(true)}
                    className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Trigger Retrain
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Retrain Modal */}
        {showRetrain && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-db-gray-800 dark:text-white">
                  Trigger Retrain
                </h2>
                <button
                  onClick={() => setShowRetrain(false)}
                  className="text-db-gray-400 hover:text-db-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-db-gray-600 dark:text-gray-400 mb-4">
                Select a Training Sheet with approved Q&A pairs and name the new model version.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Training Sheet</label>
                  <select
                    value={retrainSheetId}
                    onChange={(e) => setRetrainSheetId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                  >
                    <option value="">Select training sheet...</option>
                    {trainingSheets.map((ts) => (
                      <option key={ts.id} value={ts.id}>
                        {ts.sheet_name || ts.id} ({ts.human_verified_count || 0} verified)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Model Name</label>
                  <input
                    value={retrainModelName}
                    onChange={(e) => setRetrainModelName(e.target.value)}
                    placeholder="e.g. defect-detector-v3"
                    className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => retrainSheetId && retrainModelName && retrainMutation.mutate()}
                  disabled={!retrainSheetId || !retrainModelName || retrainMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {retrainMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Start Training
                </button>
                <button
                  onClick={() => setShowRetrain(false)}
                  className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template Picker Modal */}
        {feedbackToConvert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-db-gray-800 dark:text-white">
                  Select Template
                </h2>
                <button
                  onClick={() => setFeedbackToConvert(null)}
                  className="text-db-gray-400 hover:text-db-gray-600 dark:hover:text-gray-300"
                >
                  &times;
                </button>
              </div>
              <p className="text-sm text-db-gray-600 dark:text-gray-400 mb-4">
                Choose which template to use for converting this feedback to training data:
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      convertMutation.mutate({
                        feedbackId: feedbackToConvert,
                        templateId: t.id,
                      });
                      setFeedbackToConvert(null);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-db-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                  >
                    <div className="font-medium text-db-gray-800 dark:text-white">
                      {t.name}
                    </div>
                    {t.description && (
                      <div className="text-sm text-db-gray-500 dark:text-gray-400 mt-1">
                        {t.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
