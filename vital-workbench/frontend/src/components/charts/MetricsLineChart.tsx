/**
 * MetricsLineChart - Time series chart for latency/throughput metrics
 *
 * Features:
 * - Responsive design
 * - Time range filtering
 * - Multiple data series support
 * - Loading and empty states
 * - Databricks color scheme
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import { clsx } from "clsx";

// ============================================================================
// Types
// ============================================================================

export interface MetricDataPoint {
  timestamp: string; // ISO timestamp or formatted string
  value: number;
  label?: string; // Optional formatted label for display
}

export interface MetricSeries {
  name: string;
  data: MetricDataPoint[];
  color: string; // Tailwind color class (e.g., "cyan-600")
  strokeWidth?: number;
}

export interface MetricsLineChartProps {
  series: MetricSeries[];
  title?: string;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  yAxisLabel?: string;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
  showLegend?: boolean;
  showGrid?: boolean;
}

// ============================================================================
// Color Mapping
// ============================================================================

const TAILWIND_TO_HEX: Record<string, string> = {
  "cyan-600": "#0891b2",
  "rose-600": "#e11d48",
  "indigo-600": "#4f46e5",
  "amber-600": "#d97706",
  "green-600": "#16a34a",
  "purple-600": "#9333ea",
  "blue-600": "#2563eb",
  "red-600": "#dc2626",
};

// ============================================================================
// Custom Tooltip
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
  formatValue?: (value: number) => string;
}

function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-db-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-db-gray-800 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-db-gray-600">{entry.name}:</span>
          <span className="font-semibold text-db-gray-800">
            {formatValue ? formatValue(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MetricsLineChart({
  series,
  title,
  height = 300,
  loading = false,
  empty = false,
  emptyMessage = "No data available",
  yAxisLabel,
  formatYAxis,
  formatTooltip,
  showLegend = true,
  showGrid = true,
}: MetricsLineChartProps) {
  // Loading state
  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-db-gray-50 rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
          <p className="text-sm text-db-gray-500">Loading metrics...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (empty || series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div
        className="flex items-center justify-center bg-db-gray-50 rounded-lg"
        style={{ height }}
      >
        <div className="text-center text-db-gray-400">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Merge all data points by timestamp
  const allTimestamps = new Set<string>();
  series.forEach((s) => {
    s.data.forEach((d) => allTimestamps.add(d.timestamp));
  });

  const timestamps = Array.from(allTimestamps).sort();

  // Build chart data
  const chartData = timestamps.map((timestamp) => {
    const point: Record<string, string | number> = { timestamp };
    series.forEach((s) => {
      const dataPoint = s.data.find((d) => d.timestamp === timestamp);
      point[s.name] = dataPoint?.value ?? 0;
    });
    return point;
  });

  return (
    <div className={clsx("w-full", title && "space-y-2")}>
      {title && (
        <h4 className="text-sm font-medium text-db-gray-700">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          )}
          <XAxis
            dataKey="timestamp"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            tickFormatter={(value) => {
              // Format timestamp for display (e.g., "14:30" or "Feb 7")
              try {
                const date = new Date(value);
                return date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              } catch {
                return value;
              }
            }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: "12px", fill: "#6b7280" },
                  }
                : undefined
            }
            tickFormatter={formatYAxis}
          />
          <Tooltip
            content={<CustomTooltip formatValue={formatTooltip} />}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="line"
            />
          )}
          {series.map((s) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={TAILWIND_TO_HEX[s.color] || s.color}
              strokeWidth={s.strokeWidth ?? 2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
