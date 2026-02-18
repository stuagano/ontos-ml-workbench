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
  ExternalLink,
  Loader2,
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
  Search,
  Filter,
} from "lucide-react";
import { DataTable, Column, RowAction } from "../components/DataTable";
import { StageSubNav } from "../components/StageSubNav";
import { MetricCard } from "../components/MetricCard";
import { WorkflowBanner } from "../components/WorkflowBanner";
import { MetricsLineChart, MetricSeries } from "../components/charts";
import { clsx } from "clsx";
import {
  listServingEndpoints,
  getFeedbackStats,
  getPerformanceMetrics,
  getRealtimeMetrics,
  listAlerts,
  getDriftDetection,
  type ServingEndpoint,
  type FeedbackStats,
  type Alert as ApiAlert,
  type DriftDetection,
} from "../services/api";
import { openDatabricks } from "../services/databricksLinks";
import { useToast } from "../components/Toast";
import { StatusBadge } from "../components/StatusBadge";
import {
  MONITOR_ENDPOINT_STATUS_CONFIG,
  getStatusConfig,
  isStatusActive,
} from "../constants/statusConfig";

// ============================================================================
// Types
// ============================================================================

type TimeRange = "1h" | "24h" | "7d" | "30d";

// Map time range to hours
const TIME_RANGE_HOURS: Record<TimeRange, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

// ============================================================================
// Mock Chart Data Generator
// ============================================================================

function generateMockChartData(
  timeRange: TimeRange,
  hasEndpoints: boolean
): MetricSeries[] {
  if (!hasEndpoints) {
    return [];
  }

  const hours = TIME_RANGE_HOURS[timeRange];
  const points = Math.min(hours, 24); // Max 24 data points
  const now = new Date();
  const interval = (hours * 60 * 60 * 1000) / points; // ms per point

  const requestData = [];
  const latencyData = [];

  for (let i = points; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * interval).toISOString();

    // Generate request volume (with some variation)
    const baseRequests = 1200;
    const variation = Math.sin(i * 0.5) * 200 + Math.random() * 100;
    requestData.push({
      timestamp,
      value: Math.max(0, Math.floor(baseRequests + variation)),
    });

    // Generate latency (with some variation)
    const baseLatency = 180;
    const latencyVariation = Math.sin(i * 0.3) * 30 + Math.random() * 20;
    latencyData.push({
      timestamp,
      value: Math.max(50, Math.floor(baseLatency + latencyVariation)),
    });
  }

  return [
    {
      name: "Requests/min",
      data: requestData,
      color: "cyan-600",
      strokeWidth: 2,
    },
  ];
}

// MetricCard component moved to /frontend/src/components/MetricCard.tsx

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
  const config = getStatusConfig(endpoint.state, MONITOR_ENDPOINT_STATUS_CONFIG);

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
        <StatusBadge
          config={config}
          animate={isStatusActive(endpoint.state)}
          size="sm"
        />
      </div>
    </button>
  );
}

// ============================================================================
// Alert Item Component
// ============================================================================

interface AlertItemProps {
  alert: ApiAlert;
}

function AlertItem({ alert }: AlertItemProps) {
  const getAlertColor = (status: string, alertType: string) => {
    if (status === "active") {
      if (alertType === "error_rate" || alertType === "quality") {
        return "bg-red-50 border-red-200 text-red-800";
      }
      if (alertType === "drift" || alertType === "latency") {
        return "bg-amber-50 border-amber-200 text-amber-800";
      }
    }
    return "bg-blue-50 border-blue-200 text-blue-800";
  };

  const getIcon = (status: string, alertType: string) => {
    if (status === "active") {
      if (alertType === "error_rate" || alertType === "quality") {
        return XCircle;
      }
      return AlertTriangle;
    }
    return CheckCircle;
  };

  const Icon = getIcon(alert.status, alert.alert_type);
  const colorClass = getAlertColor(alert.status, alert.alert_type);

  return (
    <div className={clsx("rounded-lg border p-3", colorClass)}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            {alert.message || `${alert.alert_type} alert triggered`}
          </div>
          <div className="text-xs opacity-75 mt-1">
            {alert.alert_type} · {alert.status}
            {alert.triggered_at && ` · ${new Date(alert.triggered_at).toLocaleString()}`}
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
  endpointId: string | null;
  driftData: DriftDetection | undefined;
  isLoading: boolean;
  onRunDriftDetection: () => void;
  isRunning: boolean;
}

function DriftPanel({
  endpointId,
  driftData,
  isLoading,
  onRunDriftDetection,
  isRunning,
}: DriftPanelProps) {
  const statusColors = {
    low: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    high: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
    critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  };

  const hasData = driftData && !isLoading;
  const colors = hasData ? statusColors[driftData.severity] : statusColors.low;

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
            disabled={isRunning || !endpointId}
            className={clsx(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors",
              isRunning || !endpointId
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

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
        </div>
      ) : hasData ? (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className={clsx("p-3 rounded-lg", colors.bg)}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={clsx("w-2 h-2 rounded-full", colors.dot)} />
                <span className={clsx("text-sm font-medium", colors.text)}>
                  {driftData.drift_detected ? "Drift Detected" : "No Drift"}
                </span>
              </div>
              <span className={clsx("text-xs", colors.text)}>
                Severity: {driftData.severity}
              </span>
            </div>
            <div className={clsx("text-2xl font-bold", colors.text)}>
              {(driftData.drift_score * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-db-gray-500 mt-1">
              Drift Score
            </div>
          </div>

          {/* Affected Features */}
          {driftData.affected_features && driftData.affected_features.length > 0 && (
            <div className="p-3 bg-db-gray-50 rounded-lg">
              <div className="text-sm font-medium text-db-gray-700 mb-2">
                Affected Features ({driftData.affected_features.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {driftData.affected_features.map((feature) => (
                  <span
                    key={feature}
                    className="px-2 py-1 bg-white text-xs text-db-gray-600 rounded border border-db-gray-200"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Time Periods */}
          <div className="text-xs text-db-gray-500">
            <div>Baseline: {driftData.baseline_period}</div>
            <div>Comparison: {driftData.comparison_period}</div>
            <div>Last checked: {new Date(driftData.detection_time).toLocaleString()}</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-db-gray-400">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {endpointId
              ? "Click 'Run Analysis' to detect drift"
              : "Select an endpoint to enable drift detection"}
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

interface MonitorPageProps {
  mode?: "browse" | "create";
}

export function MonitorPage({ mode = "browse" }: MonitorPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
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

  // Derived state
  const allEndpoints = endpoints || [];
  const readyEndpoints = allEndpoints.filter((e) => e.state === "READY");
  const hasEndpoints = readyEndpoints.length > 0;
  const selectedEp = selectedEndpoint
    ? allEndpoints.find((e) => e.name === selectedEndpoint)
    : null;

  // Fetch feedback stats
  const { data: feedbackStats, isLoading: feedbackLoading } = useQuery({
    queryKey: ["feedback-stats", selectedEndpoint],
    queryFn: () =>
      getFeedbackStats({ endpoint_id: selectedEndpoint || undefined }),
  });

  // Fetch performance metrics (real data)
  const { data: perfMetrics } = useQuery({
    queryKey: ["performance-metrics", selectedEndpoint, timeRange],
    queryFn: () =>
      getPerformanceMetrics({
        endpoint_id: selectedEndpoint || undefined,
        hours: TIME_RANGE_HOURS[timeRange],
      }),
    enabled: hasEndpoints,
  });

  // Fetch realtime metrics (5 minute window) - available for future use
  const { data: _realtimeMetrics } = useQuery({
    queryKey: ["realtime-metrics", selectedEndpoint],
    queryFn: () =>
      selectedEndpoint
        ? getRealtimeMetrics(selectedEndpoint, 5)
        : Promise.resolve(null),
    enabled: !!selectedEndpoint,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch alerts (active only)
  const { data: alertsData } = useQuery({
    queryKey: ["alerts", selectedEndpoint],
    queryFn: () =>
      listAlerts({
        endpoint_id: selectedEndpoint || undefined,
        status: "active",
      }),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch drift detection data
  const { data: driftData, isLoading: driftLoading } = useQuery({
    queryKey: ["drift-detection", selectedEndpoint],
    queryFn: () =>
      selectedEndpoint
        ? getDriftDetection(selectedEndpoint, {
            baseline_days: 7,
            comparison_hours: 24,
          })
        : Promise.resolve(null),
    enabled: !!selectedEndpoint && hasEndpoints,
  });

  // Drift detection mutation
  const driftMutation = useMutation({
    mutationFn: () => {
      if (!selectedEndpoint) throw new Error("No endpoint selected");
      return getDriftDetection(selectedEndpoint, {
        baseline_days: 7,
        comparison_hours: 1,
      });
    },
    onSuccess: () => {
      toast.success(
        "Drift Detection Completed",
        "Analysis has been refreshed",
      );
      queryClient.invalidateQueries({ queryKey: ["drift-detection"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to detect drift", error.message);
    },
  });

  // Calculate metrics from real data
  const currentMetrics = perfMetrics?.[0]; // Most recent metrics
  const metrics = {
    latency: currentMetrics?.avg_latency_ms
      ? `${Math.round(currentMetrics.avg_latency_ms)}ms`
      : "--",
    latencyChange: undefined, // Would need historical comparison
    throughput: currentMetrics?.requests_per_minute
      ? `${(currentMetrics.requests_per_minute / 1000).toFixed(1)}k/min`
      : "--",
    throughputChange: undefined,
    errorRate: currentMetrics
      ? `${(currentMetrics.error_rate * 100).toFixed(2)}%`
      : "--",
    errorRateChange: undefined,
    cost: hasEndpoints
      ? `$${(50 + readyEndpoints.length * 25).toFixed(0)}/day`
      : "--",
    costChange: undefined,
  };

  // Use real alerts from API
  const alerts = alertsData || [];

  // No endpoint selected - show browse mode with endpoint list
  if (!selectedEndpoint) {
    const filteredEndpoints = allEndpoints.filter((ep) =>
      ep.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Define table columns for endpoints
    const columns: Column<ServingEndpoint>[] = [
      {
        key: "name",
        header: "Endpoint Name",
        width: "30%",
        render: (ep) => (
          <div className="flex items-center gap-3">
            <Server className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-db-gray-900">{ep.name}</div>
              <div className="text-sm text-db-gray-500 truncate">
                {ep.creator || "System"}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "15%",
        render: (ep) => (
          <span
            className={clsx(
              "px-2 py-1 rounded-full text-xs font-medium",
              ep.state === "READY"
                ? "bg-green-100 text-green-700"
                : ep.state === "NOT_READY"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            )}
          >
            {ep.state}
          </span>
        ),
      },
      {
        key: "creator",
        header: "Creator",
        width: "15%",
        render: (ep) => (
          <span className="text-sm text-db-gray-600">
            {ep.creator || "System"}
          </span>
        ),
      },
      {
        key: "created",
        header: "Created",
        width: "20%",
        render: (ep) => (
          <span className="text-sm text-db-gray-500">
            {ep.created_at
              ? new Date(ep.created_at).toLocaleDateString()
              : "N/A"}
          </span>
        ),
      },
    ];

    // Define row actions
    const rowActions: RowAction<ServingEndpoint>[] = [
      {
        label: "Monitor",
        icon: Eye,
        onClick: (ep) => setSelectedEndpoint(ep.name),
        className: "text-rose-600",
        show: (ep) => ep.state === "READY",
      },
      {
        label: "View in Databricks",
        icon: ExternalLink,
        onClick: (ep) => openDatabricks.servingEndpoint(ep.name),
      },
    ];

    const emptyState = (
      <div className="text-center py-20 bg-white rounded-lg">
        <Activity className="w-16 h-16 text-db-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-db-gray-700 mb-2">
          {searchQuery ? "No endpoints found" : "No endpoints to monitor"}
        </h3>
        <p className="text-db-gray-500 mb-6">
          {searchQuery
            ? "Try adjusting your search"
            : "Deploy a model in the Deploy stage to start monitoring"}
        </p>
        {!searchQuery && (
          <button
            onClick={() => openDatabricks.servingEndpoints()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
          >
            <ExternalLink className="w-4 h-4" />
            View Serving Endpoints
          </button>
        )}
      </div>
    );

    return (
      <div className="flex-1 flex flex-col bg-db-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-db-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-db-gray-900">Monitor</h1>
                <p className="text-db-gray-600 mt-1">
                  Track performance, detect drift, and manage feedback
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["serving-endpoints"],
                    })
                  }
                  className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:text-db-gray-800 hover:bg-db-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={() => openDatabricks.mlflowTracing()}
                  className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700"
                >
                  <Eye className="w-4 h-4" />
                  MLflow Tracing
                </button>
                <button
                  onClick={() => openDatabricks.lakehouseMonitoring()}
                  className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lakehouse Monitoring
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Sub-Navigation */}
        <StageSubNav
          stage="monitor"
          mode="browse"
          onModeChange={() => {}}
          browseCount={allEndpoints.length}
        />

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
              <Filter className="w-4 h-4 text-db-gray-400" />
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
                <input
                  type="text"
                  placeholder="Search endpoints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-sm text-db-gray-500 hover:text-db-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 px-6 pb-6 pt-4 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {endpointsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
              </div>
            ) : (
              <DataTable
                data={filteredEndpoints}
                columns={columns}
                rowKey={(ep) => ep.name}
                onRowClick={(ep) =>
                  ep.state === "READY" && setSelectedEndpoint(ep.name)
                }
                rowActions={rowActions}
                emptyState={emptyState}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Endpoint selected - show monitoring dashboard
  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Workflow Banner */}
        <WorkflowBanner stage="monitor" />

        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedEndpoint(null)}
              className="p-2 hover:bg-db-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-db-gray-900">
                Monitor: {selectedEndpoint}
              </h1>
              <p className="text-db-gray-600 mt-1">
                Track performance, detect drift, and manage feedback
              </p>
            </div>
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
              className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700"
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
                        {getStatusConfig(selectedEp.state, MONITOR_ENDPOINT_STATUS_CONFIG).label}
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
                {/* Request Volume Chart */}
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
                  <MetricsLineChart
                    series={generateMockChartData(timeRange, hasEndpoints)}
                    height={192}
                    empty={!hasEndpoints}
                    emptyMessage="No endpoint data available"
                    yAxisLabel="Requests"
                    formatYAxis={(value) => `${value}`}
                    formatTooltip={(value) => `${value} req/min`}
                    showLegend={false}
                  />
                  {hasEndpoints && (
                    <div className="mt-2 text-center">
                      <button
                        onClick={() => openDatabricks.lakehouseMonitoring()}
                        className="text-xs text-rose-600 hover:text-rose-700"
                      >
                        Open Lakehouse Monitoring →
                      </button>
                    </div>
                  )}
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
                endpointId={selectedEndpoint}
                driftData={driftData || undefined}
                isLoading={driftLoading}
                onRunDriftDetection={() => driftMutation.mutate()}
                isRunning={driftMutation.isPending}
              />
            </div>
          </div>
        )}

        {/* Monitor Browser Modal removed - using inline table view */}
      </div>
    </div>
  );
}
