/**
 * SimpleAreaChart - Area chart for trends
 *
 * Features:
 * - Responsive design
 * - Gradient fill support
 * - Time range filtering
 * - Loading and empty states
 * - Databricks color scheme
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import { clsx } from "clsx";

// ============================================================================
// Types
// ============================================================================

export interface AreaDataPoint {
  timestamp: string; // ISO timestamp or formatted string
  value: number;
  label?: string; // Optional formatted label for display
}

export interface SimpleAreaChartProps {
  data: AreaDataPoint[];
  title?: string;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  color?: string; // Tailwind color class (e.g., "cyan-600")
  yAxisLabel?: string;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
  showGrid?: boolean;
  fillOpacity?: number;
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
    value: number;
    payload: AreaDataPoint;
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
        {entry.payload.label || entry.payload.timestamp}
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

export function SimpleAreaChart({
  data,
  title,
  height = 300,
  loading = false,
  empty = false,
  emptyMessage = "No data available",
  color = "cyan-600",
  yAxisLabel,
  formatYAxis,
  formatTooltip,
  showGrid = true,
  fillOpacity = 0.3,
}: SimpleAreaChartProps) {
  // Loading state
  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-db-gray-50 rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
          <p className="text-sm text-db-gray-500">Loading trend...</p>
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
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const hexColor = TAILWIND_TO_HEX[color] || color;

  return (
    <div className={clsx("w-full", title && "space-y-2")}>
      {title && (
        <h4 className="text-sm font-medium text-db-gray-700">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={hexColor} stopOpacity={0.8} />
              <stop offset="95%" stopColor={hexColor} stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Tooltip content={<CustomTooltip formatValue={formatTooltip} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={hexColor}
            strokeWidth={2}
            fillOpacity={fillOpacity}
            fill={`url(#gradient-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
