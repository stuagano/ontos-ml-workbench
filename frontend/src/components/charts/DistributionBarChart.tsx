/**
 * DistributionBarChart - Bar chart for distributions
 *
 * Features:
 * - Responsive design
 * - Horizontal or vertical layout
 * - Loading and empty states
 * - Databricks color scheme
 * - Percentage or absolute value display
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Loader2, BarChart3 } from "lucide-react";
import { clsx } from "clsx";

// ============================================================================
// Types
// ============================================================================

export interface DistributionDataPoint {
  category: string;
  value: number;
  color?: string; // Optional custom color per bar
}

export interface DistributionBarChartProps {
  data: DistributionDataPoint[];
  title?: string;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  layout?: "vertical" | "horizontal";
  defaultColor?: string; // Tailwind color class (e.g., "indigo-600")
  xAxisLabel?: string;
  yAxisLabel?: string;
  formatValue?: (value: number) => string;
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
    payload: DistributionDataPoint;
  }>;
  formatValue?: (value: number) => string;
}

function CustomTooltip({ active, payload, formatValue }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entry = payload[0];

  return (
    <div className="bg-white border border-db-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-db-gray-800 mb-1">
        {entry.payload.category}
      </p>
      <p className="text-sm text-db-gray-600">
        <span className="font-semibold text-db-gray-800">
          {formatValue ? formatValue(entry.value) : entry.value}
        </span>
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DistributionBarChart({
  data,
  title,
  height = 300,
  loading = false,
  empty = false,
  emptyMessage = "No data available",
  layout = "vertical",
  defaultColor = "indigo-600",
  xAxisLabel,
  yAxisLabel,
  formatValue,
  showLegend = false,
  showGrid = true,
}: DistributionBarChartProps) {
  // Loading state
  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-db-gray-50 rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
          <p className="text-sm text-db-gray-500">Loading distribution...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (empty || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-db-gray-50 rounded-lg"
        style={{ height }}
      >
        <div className="text-center text-db-gray-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const defaultHexColor = TAILWIND_TO_HEX[defaultColor] || defaultColor;

  return (
    <div className={clsx("w-full", title && "space-y-2")}>
      {title && (
        <h4 className="text-sm font-medium text-db-gray-700">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          )}
          {layout === "vertical" ? (
            <>
              <XAxis
                type="number"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                label={
                  xAxisLabel
                    ? {
                        value: xAxisLabel,
                        position: "insideBottom",
                        offset: -5,
                        style: { fontSize: "12px", fill: "#6b7280" },
                      }
                    : undefined
                }
                tickFormatter={formatValue}
              />
              <YAxis
                type="category"
                dataKey="category"
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
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey="category"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                label={
                  xAxisLabel
                    ? {
                        value: xAxisLabel,
                        position: "insideBottom",
                        offset: -5,
                        style: { fontSize: "12px", fill: "#6b7280" },
                      }
                    : undefined
                }
              />
              <YAxis
                type="number"
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
                tickFormatter={formatValue}
              />
            </>
          )}
          <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
          {showLegend && <Legend wrapperStyle={{ fontSize: "12px" }} />}
          <Bar dataKey="value" fill={defaultHexColor} radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => {
              const color = entry.color
                ? TAILWIND_TO_HEX[entry.color] || entry.color
                : defaultHexColor;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
