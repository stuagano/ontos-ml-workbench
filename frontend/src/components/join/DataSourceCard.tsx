/**
 * DataSourceCard — displays a single data source in the join configuration.
 * Shows table name, catalog path, column list with type badges, and role badge.
 */
import { Database, X, Star } from "lucide-react";
import { clsx } from "clsx";
import type { DataSourceConfig } from "../../types";

interface DataSourceCardProps {
  source: DataSourceConfig;
  columns?: { name: string; type: string }[];
  isPrimary?: boolean;
  onRemove?: () => void;
  onToggleColumn?: (column: string, selected: boolean) => void;
}

export function DataSourceCard({
  source,
  columns = [],
  isPrimary = false,
  onRemove,
  onToggleColumn,
}: DataSourceCardProps) {
  const shortName = source.source?.name || source.alias || "Unknown";
  const fullPath = source.source?.fullPath || "";

  return (
    <div
      className={clsx(
        "rounded-lg border p-4",
        isPrimary
          ? "border-blue-300 bg-blue-50/50"
          : "border-db-gray-200 bg-white"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-db-gray-500" />
          <span className="font-medium text-db-gray-900">{shortName}</span>
          {isPrimary && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              <Star className="w-3 h-3" />
              Primary
            </span>
          )}
          {!isPrimary && (
            <span className="px-2 py-0.5 text-xs font-medium bg-db-gray-100 text-db-gray-600 rounded-full">
              Secondary
            </span>
          )}
        </div>
        {!isPrimary && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-db-gray-400 hover:text-red-500 rounded"
            title="Remove data source"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Path */}
      {fullPath && (
        <p className="text-xs text-db-gray-500 mb-3 font-mono truncate">
          {fullPath}
        </p>
      )}

      {/* Column list */}
      {columns.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-db-gray-500 font-medium mb-1">
            Columns ({columns.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {columns.map((col) => {
              const isSelected =
                !source.selectedColumns || source.selectedColumns.includes(col.name);
              return (
                <button
                  key={col.name}
                  onClick={() => onToggleColumn?.(col.name, !isSelected)}
                  className={clsx(
                    "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors",
                    isSelected
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-db-gray-200 bg-db-gray-50 text-db-gray-400 line-through"
                  )}
                >
                  {col.name}
                  <span className="text-[10px] font-mono opacity-60">
                    {col.type.toLowerCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
