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
  ArrowRight,
  Loader2,
  Target,
  ChevronLeft,
  ChevronRight,
  Database,
  FileCode,
  RotateCcw,
} from "lucide-react";
import { useWorkflow } from "../context/WorkflowContext";
import { clsx } from "clsx";
import {
  listEndpoints,
  listFeedback,
  getFeedbackStats,
  listGaps,
  convertFeedbackToCuration,
  listTemplates,
} from "../services/api";
import { useToast } from "../components/Toast";
import type { FeedbackItem, Gap } from "../services/api";

// ============================================================================
// WorkflowBanner Component (Final Stage)
// ============================================================================

function WorkflowBanner() {
  const { state, goToPreviousStage, resetWorkflow, setCurrentStage } =
    useWorkflow();

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Data source */}
          {state.selectedSource && (
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <div>
                <div className="text-xs text-indigo-600 font-medium">
                  Data Source
                </div>
                <div className="text-sm text-indigo-800">
                  {state.selectedSource.name}
                </div>
              </div>
            </div>
          )}

          {/* Template */}
          {state.selectedTemplate && (
            <>
              <ChevronRight className="w-4 h-4 text-indigo-400" />
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="text-xs text-indigo-600 font-medium">
                    Template
                  </div>
                  <div className="text-sm text-indigo-800">
                    {state.selectedTemplate.name}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousStage}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Monitor
          </button>
          <button
            onClick={() => {
              resetWorkflow();
              setCurrentStage("data");
            }}
            className="flex items-center gap-1 px-4 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Start New Cycle
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FeedbackCard Component
// ============================================================================

interface FeedbackCardProps {
  item: FeedbackItem;
  onAddToTraining: (feedbackId: string) => void;
  isConverting: boolean;
}

function FeedbackCard({
  item,
  onAddToTraining,
  isConverting,
}: FeedbackCardProps) {
  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return "just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div
          className={clsx(
            "flex items-center gap-1 text-sm px-2 py-1 rounded-full",
            item.rating === "positive"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700",
          )}
        >
          {item.rating === "positive" ? (
            <ThumbsUp className="w-3 h-3" />
          ) : (
            <ThumbsDown className="w-3 h-3" />
          )}
          {item.rating}
        </div>
        <span className="text-xs text-db-gray-400">
          {timeAgo(item.created_at)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-db-gray-500">Input:</span>
          <p className="text-db-gray-800 line-clamp-2">{item.input_text}</p>
        </div>
        <div>
          <span className="text-db-gray-500">Output:</span>
          <p className="text-db-gray-800 line-clamp-2">{item.output_text}</p>
        </div>
        {item.feedback_text && (
          <div className="pt-2 border-t border-db-gray-100">
            <span className="text-db-gray-500">Comment:</span>
            <p className="text-db-gray-800">{item.feedback_text}</p>
          </div>
        )}
      </div>

      {item.rating === "negative" && (
        <button
          onClick={() => onAddToTraining(item.id)}
          disabled={isConverting}
          className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
        >
          {isConverting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ArrowRight className="w-3 h-3" />
          )}
          Add to training data
        </button>
      )}
    </div>
  );
}

// ============================================================================
// GapCard Component
// ============================================================================

interface GapCardProps {
  gap: Gap;
}

function GapCard({ gap }: GapCardProps) {
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
    </div>
  );
}

// ============================================================================
// StatsCard Component
// ============================================================================

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof MessageSquare;
  color: string;
}

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <div className={clsx("flex items-center gap-2 mb-1", color)}>
        <Icon className="w-4 h-4" />
        <span className="text-sm">{title}</span>
      </div>
      <div
        className={clsx(
          "text-2xl font-bold",
          color.replace("text-", "text-").replace("-600", "-700"),
        )}
      >
        {value}
      </div>
      {subtitle && (
        <div className={clsx("text-xs mt-1", color.replace("-600", "-500"))}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ImprovePage Component
// ============================================================================

export function ImprovePage() {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    null,
  );
  const [ratingFilter, setRatingFilter] = useState<
    "all" | "positive" | "negative"
  >("all");
  const [convertingId, setConvertingId] = useState<string | null>(null);
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
      setConvertingId(null);
    },
    onError: (error) => {
      toast.error("Failed to convert feedback", error.message);
      setConvertingId(null);
    },
  });

  const readyEndpoints = endpoints || [];
  const feedbackItems = feedbackData?.items || [];
  const gaps = gapsData?.gaps || [];
  const templates = templatesData?.templates || [];

  const handleAddToTraining = (feedbackId: string) => {
    if (templates.length === 0) {
      alert("No templates available. Create a template first.");
      return;
    }
    setConvertingId(feedbackId);
    // Use first template for now - could add a selector
    convertMutation.mutate({ feedbackId, templateId: templates[0].id });
  };

  const isLoading = endpointsLoading || feedbackLoading;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Workflow Banner */}
        <WorkflowBanner />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-db-gray-900">Improve</h1>
            <p className="text-db-gray-600 mt-1">
              Collect feedback, identify gaps, and continuously improve
            </p>
          </div>
          <div className="flex items-center gap-3">
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
          </div>
        </div>

        {isLoading ? (
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent feedback */}
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

                {feedbackItems.length === 0 ? (
                  <div className="bg-white rounded-lg border border-db-gray-200 p-8 text-center">
                    <MessageSquare className="w-10 h-10 text-db-gray-300 mx-auto mb-3" />
                    <p className="text-db-gray-500">No feedback yet</p>
                    <p className="text-sm text-db-gray-400 mt-1">
                      Feedback will appear here as users rate responses
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {feedbackItems.map((item) => (
                      <FeedbackCard
                        key={item.id}
                        item={item}
                        onAddToTraining={handleAddToTraining}
                        isConverting={convertingId === item.id}
                      />
                    ))}
                  </div>
                )}
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
                      <GapCard key={gap.id} gap={gap} />
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
                  <button className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                    Start Improvement Cycle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
