/**
 * LabelVersionHistory - Expandable version history panel for canonical labels
 *
 * Shows a timeline of label changes with diffs between versions.
 * Used in any context where a canonical label is displayed.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  ChevronDown,
  ChevronRight,
  Loader2,
  User,
  Clock,
  Shield,
} from "lucide-react";
import { clsx } from "clsx";
import { getCanonicalLabelVersions } from "../services/api";
import type { CanonicalLabelVersion } from "../types";

interface LabelVersionHistoryProps {
  labelId: string;
  className?: string;
}

export function LabelVersionHistory({
  labelId,
  className,
}: LabelVersionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  const { data: versions, isLoading } = useQuery({
    queryKey: ["canonical-label-versions", labelId],
    queryFn: () => getCanonicalLabelVersions(labelId),
    enabled: isExpanded,
  });

  return (
    <div className={clsx("border border-db-gray-200 rounded-lg", className)}>
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-db-gray-700 hover:bg-db-gray-50 transition-colors rounded-lg"
      >
        <History className="w-4 h-4 text-db-gray-400" />
        <span>Version History</span>
        {versions && versions.length > 0 && (
          <span className="text-xs text-db-gray-400 ml-1">
            ({versions.length} version{versions.length !== 1 ? "s" : ""})
          </span>
        )}
        <span className="ml-auto">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-db-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-db-gray-400" />
          )}
        </span>
      </button>

      {/* Version list */}
      {isExpanded && (
        <div className="border-t border-db-gray-200 px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-db-gray-400" />
            </div>
          ) : versions && versions.length > 0 ? (
            <div className="space-y-2">
              {versions.map((version) => (
                <VersionEntry
                  key={version.version}
                  version={version}
                  isExpanded={expandedVersion === version.version}
                  onToggle={() =>
                    setExpandedVersion(
                      expandedVersion === version.version
                        ? null
                        : version.version,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-db-gray-500 py-4 text-center">
              No previous versions
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function VersionEntry({
  version,
  isExpanded,
  onToggle,
}: {
  version: CanonicalLabelVersion;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const formattedDate = version.modified_at
    ? new Date(version.modified_at).toLocaleString()
    : "Unknown date";

  return (
    <div className="border border-db-gray-100 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-db-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-db-gray-100 text-xs font-medium text-db-gray-600">
          v{version.version}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-3 h-3 text-db-gray-400" />
            <span className="text-db-gray-700 truncate">
              {version.modified_by}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-db-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formattedDate}</span>
            <Shield className="w-3 h-3 ml-2" />
            <span>{version.confidence}</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-db-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-db-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {version.notes && (
            <div className="text-sm text-db-gray-600 bg-db-gray-50 rounded p-2">
              {version.notes}
            </div>
          )}
          <div className="bg-db-gray-50 rounded p-2 overflow-auto max-h-48">
            <pre className="text-xs font-mono text-db-gray-700 whitespace-pre-wrap">
              {typeof version.label_data === "string"
                ? version.label_data
                : JSON.stringify(version.label_data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
