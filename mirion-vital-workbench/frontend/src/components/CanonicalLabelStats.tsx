/**
 * Canonical Label Statistics Component
 *
 * Displays aggregated statistics for canonical labels in a sheet.
 */

import { useSheetCanonicalStats } from "../hooks/useCanonicalLabels";
import type { CanonicalLabel } from "../types";

interface CanonicalLabelStatsProps {
  sheetId: string;
  onViewMostReused?: (label: CanonicalLabel) => void;
}

export function CanonicalLabelStats({
  sheetId,
  onViewMostReused,
}: CanonicalLabelStatsProps) {
  const { data: stats, isLoading, error } = useSheetCanonicalStats(sheetId);

  if (isLoading) {
    return <CanonicalLabelStatsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">
          Error loading statistics:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Labels */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total Labels</div>
          <div className="text-3xl font-bold text-blue-600">
            {stats.total_labels}
          </div>
          <div className="text-xs text-gray-500 mt-1">Expert-validated</div>
        </div>

        {/* Coverage */}
        {stats.coverage_percent != null && (
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Coverage</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.coverage_percent.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Items with labels</div>
          </div>
        )}

        {/* Average Reuse */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Avg Reuse</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.avg_reuse_count.toFixed(1)}x
          </div>
          <div className="text-xs text-gray-500 mt-1">Per label</div>
        </div>

        {/* Label Types */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Label Types</div>
          <div className="text-3xl font-bold text-orange-600">
            {Object.keys(stats.labels_by_type).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Different types</div>
        </div>
      </div>

      {/* Labels by Type */}
      {Object.keys(stats.labels_by_type).length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Labels by Type
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.labels_by_type)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const percentage = (count / stats.total_labels) * 100;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{type}</span>
                      <span className="text-gray-600">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Most Reused Labels */}
      {stats.most_reused_labels.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Most Reused Labels
          </h3>
          <div className="space-y-2">
            {stats.most_reused_labels.map((label, index) => (
              <div
                key={label.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => onViewMostReused?.(label)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {label.label_type}
                    </div>
                    <div className="text-xs text-gray-600 font-mono truncate max-w-md">
                      {label.item_ref}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      label.confidence === "high"
                        ? "bg-green-100 text-green-800"
                        : label.confidence === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {label.confidence}
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-600">
                      {label.reuse_count}x
                    </div>
                    <div className="text-xs text-gray-500">reused</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for canonical label stats
 */
export function CanonicalLabelStatsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border rounded-lg p-4">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Labels by Type */}
      <div className="bg-white border rounded-lg p-4">
        <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Reused Labels */}
      <div className="bg-white border rounded-lg p-4">
        <div className="h-5 bg-gray-200 rounded w-40 mb-3"></div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
