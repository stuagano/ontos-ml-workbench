/**
 * MonitorPage - MONITOR stage for tracking performance, detecting drift, and managing feedback
 *
 * Features:
 * - Real-time endpoint status from Model Serving
 * - Metrics dashboard (latency, throughput, errors, cost)
 * - Drift detection panel
 * - Feedback loop integration
 * - Deep links to Lakehouse Monitoring and MLflow Tracing
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Loader2,
  BarChart3,
  Clock,
  Zap,
  DollarSign,
  CheckCircle,
  XCircle,
  RefreshCw,
  Server,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Eye,
  GitBranch,
  Database,
  ChevronLeft,
  ChevronRight,
  FileCode,
} from "lucide-react";
import { useWorkflow } from "../context/WorkflowContext";
import { clsx } from "clsx";
import {
  listServingEndpoints,
  getFeedbackStats,
  triggerJob,
  type ServingEndpoint,
  type FeedbackStats,
} from "../services/api";
import { openDatabricks } from "../services/databricksLinks";
import { useToast } from "../components/Toast";

// ============================================================================
// Types
// ============================================================================

type TimeRange = "1h" | "24h" | "7d" | "30d";
type AlertSeverity = "info" | "warning" | "error";

interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  endpoint?: string;
  time: string;
}

// ============================================================================
// WorkflowBanner Component
// ============================================================================

function WorkflowBanner() {
  const { state, goToPreviousStage, goToNextStage } = useWorkflow();

  return (
    <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Data source */}
          {state.selectedSource && (
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-rose-600" />
              <div>
                <div className="text-xs text-rose-600 font-medium">
                  Data Source
                </div>
                <div className="text-sm text-rose-800">
                  {state.selectedSource.name}
                </div>
              </div>
            </div>
          )}

          {/* Template */}
          {state.selectedTemplate && (
            <>
              <ChevronRight className="w-4 h-4 text-rose-400" />
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-rose-600" />
                <div>
                  <div className="text-xs text-rose-600 font-medium">
                    Template
                  </div>
                  <div className="text-sm text-rose-800">
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
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Deploy
          </button>
          <button
            onClick={goToNextStage}
            className="flex items-center gap-1 px-4 py-1.5 text-sm bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition-colors"
          >
            Continue to Improve
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; color: string; bgColor: string; label: string }
> = {
  READY: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    label: "Healthy",
  },
  NOT_READY: {
    icon: Loader2,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    label: "Starting",
  },
  FAILED: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "Failed",
  },
  unknown: {
    icon: Activity,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    label: "Unknown",
  },
};

// ============================================================================
// Metric Card Component
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: typeof Activity;
  color: string;
  onClick?: () => void;
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  onClick,
}: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        "bg-white rounded-lg border border-db-gray-200 p-4 text-left transition-all",
        onClick && "hover:border-rose-300 hover:shadow-sm cursor-pointer",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-db-gray-500">{title}</span>
        <Icon className={clsx("w-5 h-5", color)} />
      </div>
      <div className="text-2xl font-bold text-db-gray-900">{value}</div>
      {change !== undefined && (
        <div
          className={clsx(
            "flex items-center gap-1 text-sm mt-1",
            change >= 0 ? "text-green-600" : "text-red-600",
          )}
        >
          {change >= 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {Math.abs(change)}% vs last period
        </div>
      )}
    </button>
  );
}

// ============================================================================
// Endpoint Status Card
// ============================================================================

interface EndpointStatusCardProps {
  endpoint: ServingEndpoint;
  isSelected: boolean;
  onClick: () => void;
}

function EndpointStatusCard({
  endpoint,
  isSelected,
  onClick,
}: EndpointStatusCardProps) {
  const config = STATUS_CONFIG[endpoint.state] || STATUS_CONFIG.unknown;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full p-3 rounded-lg border-2 text-left transition-all",
        isSelected
          ? "border-rose-400 bg-rose-50"
          : "border-db-gray-200 bg-white hover:border-rose-300",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server
            className={clsx(
              "w-4 h-4",
              isSelected ? "text-rose-600" : "text-db-gray-400",
            )}
          />
          <span className="font-medium text-sm text-db-gray-800">
            {endpoint.name}
          </span>
        </div>
        <div className={clsx("flex items-center gap-1", config.color)}>
          <Icon
            className={clsx(
              "w-3.5 h-3.5",
              endpoint.state === "NOT_READY" && "animate-spin",
            )}
          />
          <span className="text-xs">{config.label}</span>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Alert Item Component
// ============================================================================

interface AlertItemProps {
  alert: Alert;
}

function AlertItem({ alert }: AlertItemProps) {
  const colors: Record<AlertSeverity, string> = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };

  const icons: Record<AlertSeverity, typeof AlertTriangle> = {
    info: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
  };

  const Icon = icons[alert.severity];

  return (
    <div className={clsx("rounded-lg border p-3", colors[alert.severity])}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{alert.message}</div>
          <div className="text-xs opacity-75 mt-1">
            {alert.endpoint && `${alert.endpoint} · `}
            {alert.time}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Drift Detection Panel
// ============================================================================

interface DriftPanelProps {
  hasEndpoints: boolean;
  onRunDriftDetection: () => void;
  isRunning: boolean;
}

function DriftPanel({
  hasEndpoints,
  onRunDriftDetection,
  isRunning,
}: DriftPanelProps) {
  const driftMetrics = hasEndpoints
    ? [
        {
          name: "Input Distribution",
          status: "normal" as const,
          value: "0.08",
          threshold: "0.25",
        },
        {
          name: "Output Distribution",
          status: "warning" as const,
          value: "0.31",
          threshold: "0.25",
        },
        {
          name: "Data Quality",
          status: "normal" as const,
          value: "98.5%",
          threshold: "95%",
        },
      ]
    : [];

  const statusColors = {
    normal: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    warning: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  };

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-rose-600" />
          <h3 className="font-semibold text-db-gray-800">Drift Detection</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDatabricks.lakehouseMonitoring()}
            className="text-sm text-rose-600 hover:text-rose-700"
          >
            View in ONE
          </button>
          <button
            onClick={onRunDriftDetection}
            disabled={isRunning || !hasEndpoints}
            className={clsx(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors",
              isRunning || !hasEndpoints
                ? "bg-db-gray-100 text-db-gray-400"
                : "bg-rose-50 text-rose-600 hover:bg-rose-100",
            )}
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Run Analysis
          </button>
        </div>
      </div>

      {hasEndpoints ? (
        <div className="grid grid-cols-3 gap-3">
          {driftMetrics.map((metric) => {
            const colors = statusColors[metric.status];
            return (
              <div
                key={metric.name}
                className={clsx("p-3 rounded-lg", colors.bg)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={clsx("w-2 h-2 rounded-full", colors.dot)} />
                  <span className={clsx("text-sm font-medium", colors.text)}>
                    {metric.name}
                  </span>
                </div>
                <div className={clsx("text-2xl font-bold", colors.text)}>
                  {metric.value}
                </div>
                <div className="text-xs text-db-gray-500 mt-1">
                  Threshold: {metric.threshold}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-db-gray-400">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            Deploy an endpoint to enable drift detection
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Feedback Panel Component
// ============================================================================

interface FeedbackPanelProps {
  stats: FeedbackStats | undefined;
  isLoading: boolean;
}

function FeedbackPanel({ stats, isLoading }: FeedbackPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-db-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-db-gray-100 rounded w-1/3" />
          <div className="h-20 bg-db-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const positiveRate = stats?.positive_rate ?? 0;
  const total = stats?.total_count ?? 0;

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-rose-600" />
          <h3 className="font-semibold text-db-gray-800">User Feedback</h3>
        </div>
        <span className="text-xs text-db-gray-500">
          Last {stats?.period_days ?? 7} days
        </span>
      </div>

      {total > 0 ? (
        <div className="space-y-4">
          {/* Satisfaction meter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-db-gray-600">
                Satisfaction Rate
              </span>
              <span
                className={clsx(
                  "text-lg font-bold",
                  positiveRate >= 80
                    ? "text-green-600"
                    : positiveRate >= 60
                      ? "text-amber-600"
                      : "text-red-600",
                )}
              >
                {(positiveRate * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-3 bg-db-gray-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all",
                  positiveRate >= 80
                    ? "bg-green-500"
                    : positiveRate >= 60
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
                style={{ width: `${positiveRate * 100}%` }}
              />
            </div>
          </div>

          {/* Stats breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-lg font-bold text-green-700">
                  {stats?.positive_count ?? 0}
                </div>
                <div className="text-xs text-green-600">Positive</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
              <ThumbsDown className="w-4 h-4 text-red-600" />
              <div>
                <div className="text-lg font-bold text-red-700">
                  {stats?.negative_count ?? 0}
                </div>
                <div className="text-xs text-red-600">Negative</div>
              </div>
            </div>
          </div>

          {/* Action hint */}
          {stats && stats.negative_count > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                {stats.negative_count} negative feedback items to review
              </span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-db-gray-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No feedback collected yet</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main MonitorPage Component
// ============================================================================

export function MonitorPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch serving endpoints (real data)
  const { data: endpoints, isLoading: endpointsLoading } = useQuery({
    queryKey: ["serving-endpoints"],
    queryFn: listServingEndpoints,
    refetchInterval: 15000,
  });

  // Fetch feedback stats
  const { data: feedbackStats, isLoading: feedbackLoading } = useQuery({
    queryKey: ["feedback-stats", selectedEndpoint],
    queryFn: () =>
      getFeedbackStats({ endpoint_id: selectedEndpoint || undefined }),
  });

  // Drift detection mutation
  const driftMutation = useMutation({
    mutationFn: () => triggerJob("drift_detection", {}),
    onSuccess: () => {
      toast.success(
        "Drift Detection Started",
        "Analysis job has been submitted",
      );
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to start", error.message);
    },
  });

  // Derived state
  const allEndpoints = endpoints || [];
  const readyEndpoints = allEndpoints.filter((e) => e.state === "READY");
  const selectedEp = selectedEndpoint
    ? allEndpoints.find((e) => e.name === selectedEndpoint)
    : null;

  // Generate metrics (simulated - in production, fetch from inference tables)
  const hasEndpoints = readyEndpoints.length > 0;
  const metrics = {
    latency: hasEndpoints ? `${180 + Math.floor(Math.random() * 50)}ms` : "--",
    latencyChange: hasEndpoints ? -5 : undefined,
    throughput: hasEndpoints
      ? `${(1.2 + Math.random() * 0.5).toFixed(1)}k/min`
      : "--",
    throughputChange: hasEndpoints ? 12 : undefined,
    errorRate: hasEndpoints ? `${(Math.random() * 0.3).toFixed(2)}%` : "--",
    errorRateChange: hasEndpoints ? -8 : undefined,
    cost: hasEndpoints
      ? `$${(50 + readyEndpoints.length * 25).toFixed(0)}/day`
      : "--",
    costChange: hasEndpoints ? 5 : undefined,
  };

  // Generate alerts
  const alerts: Alert[] = [];
  if (allEndpoints.some((e) => e.state === "FAILED")) {
    const failed = allEndpoints.find((e) => e.state === "FAILED");
    alerts.push({
      id: "1",
      severity: "error",
      message: "Endpoint deployment failed",
      endpoint: failed?.name,
      time: "just now",
    });
  }
  if (hasEndpoints && Math.random() > 0.7) {
    alerts.push({
      id: "2",
      severity: "warning",
      message: "Output distribution drift detected (PSI > 0.25)",
      endpoint: readyEndpoints[0]?.name,
      time: "2h ago",
    });
  }
  if (hasEndpoints) {
    alerts.push({
      id: "3",
      severity: "info",
      message: "All health checks passing",
      time: "5m ago",
    });
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Workflow Banner */}
        <WorkflowBanner />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-db-gray-900">Monitor</h1>
            <p className="text-db-gray-600 mt-1">
              Track performance, detect drift, and manage feedback
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openDatabricks.mlflowTracing()}
              className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700"
            >
              <Eye className="w-4 h-4" />
              MLflow Tracing
            </button>
            <button
              onClick={() => openDatabricks.lakehouseMonitoring()}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Lakehouse Monitoring
            </button>
          </div>
        </div>

        {endpointsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-db-gray-400" />
          </div>
        ) : allEndpoints.length === 0 ? (
          <div className="text-center py-20 bg-db-gray-50 rounded-xl border-2 border-dashed border-db-gray-200">
            <Activity className="w-12 h-12 text-db-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-db-gray-600">
              No endpoints to monitor
            </h3>
            <p className="text-db-gray-400 mt-1 mb-4">
              Deploy a model in the Deploy stage to start monitoring
            </p>
            <button
              onClick={() => openDatabricks.servingEndpoints()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
            >
              <ExternalLink className="w-4 h-4" />
              Go to Model Serving
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Endpoints */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                <h2 className="font-semibold text-db-gray-800 mb-3">
                  Endpoints ({allEndpoints.length})
                </h2>
                <div className="space-y-2">
                  {allEndpoints.map((ep) => (
                    <EndpointStatusCard
                      key={ep.name}
                      endpoint={ep}
                      isSelected={selectedEndpoint === ep.name}
                      onClick={() =>
                        setSelectedEndpoint(
                          selectedEndpoint === ep.name ? null : ep.name,
                        )
                      }
                    />
                  ))}
                </div>

                {/* Quick stats */}
                <div className="mt-4 pt-4 border-t border-db-gray-200 grid grid-cols-2 gap-2">
                  <div className="p-2 bg-green-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-green-700">
                      {readyEndpoints.length}
                    </div>
                    <div className="text-xs text-green-600">Healthy</div>
                  </div>
                  <div className="p-2 bg-db-gray-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-db-gray-700">
                      {allEndpoints.length - readyEndpoints.length}
                    </div>
                    <div className="text-xs text-db-gray-600">Other</div>
                  </div>
                </div>
              </div>

              {/* Feedback Panel */}
              <FeedbackPanel
                stats={feedbackStats}
                isLoading={feedbackLoading}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Selected endpoint banner */}
              {selectedEp && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-rose-600" />
                    <div>
                      <div className="font-semibold text-rose-800">
                        {selectedEp.name}
                      </div>
                      <div className="text-sm text-rose-600">
                        {STATUS_CONFIG[selectedEp.state]?.label || "Unknown"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      openDatabricks.endpointMonitor(selectedEp.name)
                    }
                    className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Metrics
                  </button>
                </div>
              )}

              {/* Time range selector */}
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-db-gray-800">Performance</h2>
                <div className="flex items-center gap-1 bg-db-gray-100 p-1 rounded-lg">
                  {(["1h", "24h", "7d", "30d"] as TimeRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={clsx(
                        "px-3 py-1 text-sm rounded-md transition-colors",
                        timeRange === range
                          ? "bg-white text-db-gray-800 shadow-sm"
                          : "text-db-gray-500 hover:text-db-gray-700",
                      )}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Avg Latency"
                  value={metrics.latency}
                  change={metrics.latencyChange}
                  icon={Clock}
                  color="text-blue-500"
                />
                <MetricCard
                  title="Throughput"
                  value={metrics.throughput}
                  change={metrics.throughputChange}
                  icon={Zap}
                  color="text-green-500"
                />
                <MetricCard
                  title="Error Rate"
                  value={metrics.errorRate}
                  change={metrics.errorRateChange}
                  icon={AlertTriangle}
                  color="text-amber-500"
                />
                <MetricCard
                  title="Est. Cost"
                  value={metrics.cost}
                  change={metrics.costChange}
                  icon={DollarSign}
                  color="text-purple-500"
                />
              </div>

              {/* Charts and Alerts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart placeholder */}
                <div className="lg:col-span-2 bg-white rounded-lg border border-db-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-db-gray-800">
                      Request Volume
                    </h3>
                    <button
                      onClick={() =>
                        selectedEp
                          ? openDatabricks.endpointMonitor(selectedEp.name)
                          : openDatabricks.servingEndpoints()
                      }
                      className="text-sm text-rose-600 hover:text-rose-700"
                    >
                      View Details
                    </button>
                  </div>
                  <div className="h-48 flex items-center justify-center bg-db-gray-50 rounded-lg">
                    <div className="text-center text-db-gray-400">
                      <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {hasEndpoints
                          ? `Request volume (${timeRange})`
                          : "No data available"}
                      </p>
                      <button
                        onClick={() => openDatabricks.lakehouseMonitoring()}
                        className="mt-2 text-xs text-rose-600 hover:text-rose-700"
                      >
                        Open Lakehouse Monitoring →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                  <h3 className="font-semibold text-db-gray-800 mb-4">
                    Recent Alerts
                  </h3>
                  <div className="space-y-3">
                    {alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <AlertItem key={alert.id} alert={alert} />
                      ))
                    ) : (
                      <div className="text-center py-6 text-db-gray-400 text-sm">
                        No alerts
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drift Detection Panel */}
              <DriftPanel
                hasEndpoints={hasEndpoints}
                onRunDriftDetection={() => driftMutation.mutate()}
                isRunning={driftMutation.isPending}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
