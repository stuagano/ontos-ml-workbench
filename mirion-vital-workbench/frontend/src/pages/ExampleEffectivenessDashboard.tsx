/**
 * ExampleEffectivenessDashboard - Visualization of example effectiveness metrics
 *
 * Shows which examples drive improvement, usage trends, and candidates for pruning.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { useNavigate } from "react-router-dom";
import { getEffectivenessDashboard } from "../services/api";
import type {
  EffectivenessDashboardStats,
  DailyUsagePoint,
  DomainEffectiveness,
  ExampleRankingItem,
} from "../types";
import { EXAMPLE_DOMAINS } from "../types";

// ============================================================================
// Types
// ============================================================================

type Period = "7d" | "30d" | "90d";

// ============================================================================
// PeriodSelector Component
// ============================================================================

function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-db-gray-100 p-1 rounded-lg">
      {(["7d", "30d", "90d"] as Period[]).map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={clsx(
            "px-3 py-1 text-sm rounded-md transition-colors",
            value === period
              ? "bg-white text-db-gray-800 shadow-sm"
              : "text-db-gray-500 hover:text-db-gray-700"
          )}
        >
          {period}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MetricCard Component
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Activity;
  color: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-db-gray-500">{title}</span>
        <Icon className={clsx("w-5 h-5", color)} />
      </div>
      <div className="text-2xl font-bold text-db-gray-900">{value}</div>
      {subtitle && (
        <div className="text-xs text-db-gray-400 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

// ============================================================================
// UsageTrendChart Component - Pure CSS stacked bars
// ============================================================================

function UsageTrendChart({ data }: { data: DailyUsagePoint[] }) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-lg border border-db-gray-200 p-4">
        <h3 className="font-semibold text-db-gray-800 mb-4">Usage Trend</h3>
        <div className="text-center py-12 text-db-gray-400">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No usage data yet</p>
        </div>
      </div>
    );
  }

  const maxUses = Math.max(...data.map((d) => d.uses), 1);

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <h3 className="font-semibold text-db-gray-800 mb-4">Usage Trend</h3>

      {/* Chart */}
      <div className="flex items-end gap-0.5 h-40">
        {data.map((point) => {
          const totalHeight = (point.uses / maxUses) * 100;
          const successHeight =
            point.uses > 0 ? (point.successes / point.uses) * totalHeight : 0;
          const failureHeight = totalHeight - successHeight;

          return (
            <div
              key={point.date}
              className="flex-1 flex flex-col justify-end group relative min-w-[4px]"
            >
              {/* Tooltip */}
              <div
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                           hidden group-hover:block z-10
                           bg-db-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap"
              >
                <div className="font-medium">{point.date}</div>
                <div>{point.uses} uses</div>
                <div className="text-green-300">{point.successes} success</div>
                <div className="text-red-300">{point.failures} failure</div>
              </div>

              {/* Stacked bar */}
              {failureHeight > 0 && (
                <div
                  className="w-full bg-red-400 transition-all"
                  style={{ height: `${failureHeight}%` }}
                />
              )}
              {successHeight > 0 && (
                <div
                  className="w-full bg-green-500 transition-all"
                  style={{ height: `${successHeight}%` }}
                />
              )}
              {totalHeight === 0 && (
                <div className="w-full bg-db-gray-100 h-1 rounded" />
              )}
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-db-gray-400">
        {data.length > 0 && <span>{data[0].date}</span>}
        {data.length > 7 && (
          <span>{data[Math.floor(data.length / 2)].date}</span>
        )}
        {data.length > 0 && <span>{data[data.length - 1].date}</span>}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Success</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-400 rounded" />
          <span>Failure</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DomainBreakdown Component
// ============================================================================

function DomainBreakdown({ data }: { data: DomainEffectiveness[] }) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-lg border border-db-gray-200 p-4">
        <h3 className="font-semibold text-db-gray-800 mb-4">By Domain</h3>
        <p className="text-sm text-db-gray-400 text-center py-4">No domain data</p>
      </div>
    );
  }

  const maxEffectiveness = Math.max(
    ...data.map((d) => d.avg_effectiveness ?? 0),
    0.01
  );

  // Map domain IDs to labels
  const getDomainLabel = (domainId: string) => {
    const found = EXAMPLE_DOMAINS.find((d) => d.id === domainId);
    return found?.label || domainId;
  };

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <h3 className="font-semibold text-db-gray-800 mb-4">By Domain</h3>
      <div className="space-y-3">
        {data.map((item) => {
          const effectiveness = item.avg_effectiveness ?? 0;
          const barWidth = (effectiveness / maxEffectiveness) * 100;

          return (
            <div key={item.domain}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-db-gray-700">{getDomainLabel(item.domain)}</span>
                <span className="text-db-gray-500">
                  {(effectiveness * 100).toFixed(0)}% ({item.example_count})
                </span>
              </div>
              <div className="h-2 bg-db-gray-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all",
                    effectiveness >= 0.7
                      ? "bg-green-500"
                      : effectiveness >= 0.4
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ExampleRankingList Component
// ============================================================================

function ExampleRankingList({
  title,
  examples,
  type,
}: {
  title: string;
  examples: ExampleRankingItem[];
  type: "top" | "bottom";
}) {
  const navigate = useNavigate();
  const Icon = type === "top" ? Sparkles : Trash2;
  const iconColor = type === "top" ? "text-green-600" : "text-red-500";
  const borderColor = type === "top" ? "border-green-100" : "border-red-100";

  if (!examples.length) {
    return (
      <div className="bg-white rounded-lg border border-db-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={clsx("w-5 h-5", iconColor)} />
          <h3 className="font-semibold text-db-gray-800">{title}</h3>
        </div>
        <p className="text-sm text-db-gray-400 text-center py-4">No examples</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={clsx("w-5 h-5", iconColor)} />
        <h3 className="font-semibold text-db-gray-800">{title}</h3>
      </div>
      <div className="space-y-2">
        {examples.map((example, idx) => (
          <button
            key={example.example_id}
            onClick={() => navigate(`/curate/examples?id=${example.example_id}`)}
            className={clsx(
              "w-full text-left p-3 rounded-lg border transition-colors",
              "hover:bg-db-gray-50",
              borderColor
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-db-gray-400">
                    #{idx + 1}
                  </span>
                  <span className="text-sm font-medium text-db-gray-700 truncate">
                    {example.explanation || example.example_id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-db-gray-500">
                  <span>{example.domain}</span>
                  {example.function_name && (
                    <>
                      <span>·</span>
                      <span>{example.function_name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={clsx(
                    "text-sm font-semibold",
                    (example.effectiveness_score ?? 0) >= 0.7
                      ? "text-green-600"
                      : (example.effectiveness_score ?? 0) >= 0.4
                      ? "text-amber-600"
                      : "text-red-600"
                  )}
                >
                  {((example.effectiveness_score ?? 0) * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-db-gray-400">
                  {example.usage_count} uses
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HealthIndicators Component
// ============================================================================

function HealthIndicators({ stats }: { stats: EffectivenessDashboardStats }) {
  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <h3 className="font-semibold text-db-gray-800 mb-4">Health</h3>
      <div className="space-y-4">
        {/* Stale examples */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={clsx(
                "w-4 h-4",
                stats.stale_examples_count > 0 ? "text-amber-500" : "text-green-500"
              )}
            />
            <span className="text-sm text-db-gray-600">Stale (30+ days)</span>
          </div>
          <span
            className={clsx(
              "text-sm font-medium",
              stats.stale_examples_count > 0 ? "text-amber-600" : "text-green-600"
            )}
          >
            {stats.stale_examples_count}
          </span>
        </div>

        {/* Coverage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            <span className="text-sm text-db-gray-600">With usage</span>
          </div>
          <span className="text-sm font-medium text-db-gray-700">
            {stats.examples_with_usage} / {stats.total_examples}
          </span>
        </div>

        {/* Success rate indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(stats.overall_success_rate ?? 0) >= 0.7 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (stats.overall_success_rate ?? 0) >= 0.4 ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-db-gray-600">Success rate</span>
          </div>
          <span
            className={clsx(
              "text-sm font-medium",
              (stats.overall_success_rate ?? 0) >= 0.7
                ? "text-green-600"
                : (stats.overall_success_rate ?? 0) >= 0.4
                ? "text-amber-600"
                : "text-red-600"
            )}
          >
            {stats.overall_success_rate
              ? `${(stats.overall_success_rate * 100).toFixed(0)}%`
              : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ExampleEffectivenessDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const [domain, setDomain] = useState<string>("");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["effectiveness-dashboard", period, domain],
    queryFn: () =>
      getEffectivenessDashboard({
        period,
        domain: domain || undefined,
      }),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12 text-db-gray-500">
            Failed to load dashboard data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-db-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-db-gray-900">
              Example Effectiveness
            </h1>
            <p className="text-db-gray-600 mt-1">
              Track which examples drive improvement
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Domain filter */}
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="px-3 py-1.5 text-sm border border-db-gray-200 rounded-lg bg-white"
            >
              <option value="">All Domains</option>
              {EXAMPLE_DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>

            {/* Period selector */}
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Examples"
            value={stats.total_examples.toLocaleString()}
            subtitle={`${stats.examples_with_usage} with usage`}
            icon={Activity}
            color="text-indigo-600"
          />
          <MetricCard
            title={`Usage (${period})`}
            value={stats.total_uses.toLocaleString()}
            subtitle={`${stats.total_successes} success, ${stats.total_failures} failure`}
            icon={Zap}
            color="text-blue-600"
          />
          <MetricCard
            title="Success Rate"
            value={
              stats.overall_success_rate
                ? `${(stats.overall_success_rate * 100).toFixed(1)}%`
                : "N/A"
            }
            icon={
              (stats.overall_success_rate ?? 0) >= 0.7 ? TrendingUp : TrendingDown
            }
            color={
              (stats.overall_success_rate ?? 0) >= 0.7
                ? "text-green-600"
                : "text-amber-600"
            }
          />
          <MetricCard
            title="Avg Effectiveness"
            value={
              stats.avg_effectiveness_score
                ? `${(stats.avg_effectiveness_score * 100).toFixed(1)}%`
                : "N/A"
            }
            icon={Target}
            color="text-purple-600"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Time series - spans 2 columns */}
          <div className="lg:col-span-2">
            <UsageTrendChart data={stats.daily_usage} />
          </div>

          {/* Health indicators */}
          <div>
            <HealthIndicators stats={stats} />
          </div>
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <DomainBreakdown data={stats.domain_breakdown} />
          <ExampleRankingList
            title="Top Performers"
            examples={stats.top_examples}
            type="top"
          />
        </div>

        {/* Bottom examples - pruning candidates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExampleRankingList
            title="Pruning Candidates"
            examples={stats.bottom_examples}
            type="bottom"
          />
        </div>
      </div>
    </div>
  );
}

export default ExampleEffectivenessDashboard;
