/**
 * JoinPreviewTable — shows joined data with match statistics banner.
 * Includes join type toggle and generated SQL for transparency.
 */
import { useState } from "react";
import { BarChart3, Code, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";

interface MatchStats {
  totalPrimaryRows: number;
  matchedRows: number;
  unmatchedRows: number;
  matchPercentage: number;
}

interface JoinPreviewTableProps {
  rows: Record<string, unknown>[];
  totalRows: number;
  matchStats: MatchStats;
  generatedSql: string;
  joinType: "inner" | "left" | "full";
  onJoinTypeChange: (type: "inner" | "left" | "full") => void;
  isLoading?: boolean;
}

export function JoinPreviewTable({
  rows,
  totalRows,
  matchStats,
  generatedSql,
  joinType,
  onJoinTypeChange,
  isLoading = false,
}: JoinPreviewTableProps) {
  const [showSql, setShowSql] = useState(false);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const matchColor =
    matchStats.matchPercentage >= 80
      ? "text-green-700 bg-green-50 border-green-200"
      : matchStats.matchPercentage >= 50
        ? "text-yellow-700 bg-yellow-50 border-yellow-200"
        : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="space-y-3">
      {/* Match stats banner */}
      <div className={clsx("flex items-center justify-between px-4 py-3 rounded-lg border", matchColor)}>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5" />
          <div>
            <span className="font-medium">
              {matchStats.matchedRows.toLocaleString()} of{" "}
              {matchStats.totalPrimaryRows.toLocaleString()} rows matched
            </span>
            <span className="ml-2 text-sm opacity-75">
              ({matchStats.matchPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Join type toggle */}
        <div className="flex items-center gap-1 bg-white/60 rounded-lg p-0.5 border border-current/10">
          {(["inner", "left", "full"] as const).map((type) => (
            <button
              key={type}
              onClick={() => onJoinTypeChange(type)}
              className={clsx(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                joinType === type
                  ? "bg-white shadow-sm text-db-gray-900"
                  : "text-current/60 hover:text-current/80"
              )}
            >
              {type === "full" ? "FULL" : type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SQL toggle */}
      <button
        onClick={() => setShowSql(!showSql)}
        className="flex items-center gap-2 text-xs text-db-gray-500 hover:text-db-gray-700"
      >
        <Code className="w-3.5 h-3.5" />
        {showSql ? "Hide" : "Show"} generated SQL
        {showSql ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>
      {showSql && (
        <pre className="p-3 bg-db-gray-50 border border-db-gray-200 rounded-lg text-xs font-mono overflow-x-auto text-db-gray-700">
          {generatedSql}
        </pre>
      )}

      {/* Data table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-db-gray-500 text-sm">
          No matching rows found with current join configuration
        </div>
      ) : (
        <div className="border border-db-gray-200 rounded-lg overflow-auto max-h-[400px]">
          <table className="w-full">
            <thead className="bg-db-gray-50 border-b border-db-gray-200 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-xs font-medium text-db-gray-600 uppercase whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-db-gray-100">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-db-gray-50">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 text-sm text-db-gray-800 whitespace-nowrap max-w-[200px] truncate"
                    >
                      {row[col] == null ? (
                        <span className="text-db-gray-300 italic">null</span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-db-gray-50 border-t border-db-gray-200 text-xs text-db-gray-500">
            Showing {rows.length} of {totalRows.toLocaleString()} joined rows
          </div>
        </div>
      )}
    </div>
  );
}
