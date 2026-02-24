/**
 * JoinKeySuggestions — ranked suggestion cards with confidence indicators.
 * Supports multi-select: users click to toggle suggestions into a staging area.
 */
import { ArrowLeftRight, Check } from "lucide-react";
import { clsx } from "clsx";
import type { JoinKeySuggestion } from "../../types";

interface JoinKeySuggestionsProps {
  suggestions: JoinKeySuggestion[];
  /** Set of selected pairs (source__target keys) */
  selectedKeys: Set<string>;
  onToggle: (suggestion: JoinKeySuggestion) => void;
  isLoading?: boolean;
}

/** Stable key for a suggestion pair */
export function suggestionKey(s: { source_column: string; target_column: string }): string {
  return `${s.source_column}__${s.target_column}`;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.5) return "bg-yellow-500";
  return "bg-red-400";
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "text-green-700 bg-green-50 border-green-200";
  if (confidence >= 0.5) return "text-yellow-700 bg-yellow-50 border-yellow-200";
  return "text-red-700 bg-red-50 border-red-200";
}

export function JoinKeySuggestions({
  suggestions,
  selectedKeys,
  onToggle,
  isLoading = false,
}: JoinKeySuggestionsProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-db-gray-700">Analyzing join keys...</p>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 rounded-lg border border-db-gray-200 bg-db-gray-50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-db-gray-500 border border-db-gray-200 rounded-lg bg-db-gray-50">
        No join key candidates found. You can manually select columns below.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-db-gray-700">
        Suggested Join Keys
        <span className="ml-2 text-db-gray-400 font-normal">
          (select one or more to build a composite key)
        </span>
      </p>
      {suggestions.map((s, idx) => {
        const key = suggestionKey(s);
        const isSelected = selectedKeys.has(key);
        const pct = Math.round(s.confidence * 100);

        return (
          <button
            key={idx}
            onClick={() => onToggle(s)}
            className={clsx(
              "w-full text-left px-4 py-3 rounded-lg border transition-all",
              isSelected
                ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                : "border-db-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={clsx(
                    "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    isSelected
                      ? "bg-blue-600 border-blue-600"
                      : "border-db-gray-300 bg-white"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="font-mono text-sm text-db-gray-800 truncate">
                  {s.source_column}
                </span>
                <ArrowLeftRight className="w-4 h-4 text-db-gray-400 flex-shrink-0" />
                <span className="font-mono text-sm text-db-gray-800 truncate">
                  {s.target_column}
                </span>
              </div>

              <span
                className={clsx(
                  "flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded border",
                  confidenceLabel(s.confidence)
                )}
              >
                {pct}%
              </span>
            </div>

            {/* Confidence bar */}
            <div className="mt-2 flex items-center gap-2 ml-8">
              <div className="flex-1 h-1.5 bg-db-gray-100 rounded-full overflow-hidden">
                <div
                  className={clsx("h-full rounded-full transition-all", confidenceColor(s.confidence))}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-db-gray-400 flex-shrink-0">
                {s.reason}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
