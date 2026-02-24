import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { traverseLineage, getImpactAnalysis } from "../../services/governance";
import type { LineageNodeData } from "./LineageNode";

interface LineageDetailsPanelProps {
  node: LineageNodeData | null;
  onClose: () => void;
}

const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
};

export default function LineageDetailsPanel({ node, onClose }: LineageDetailsPanelProps) {
  const [activeView, setActiveView] = useState<"upstream" | "downstream" | "impact">("upstream");

  const upstreamQuery = useQuery({
    queryKey: ["lineage-upstream", node?.entityType, node?.entityId],
    queryFn: () => traverseLineage("upstream", node!.entityType, node!.entityId, 5),
    enabled: !!node && activeView === "upstream",
  });

  const downstreamQuery = useQuery({
    queryKey: ["lineage-downstream", node?.entityType, node?.entityId],
    queryFn: () => traverseLineage("downstream", node!.entityType, node!.entityId, 5),
    enabled: !!node && activeView === "downstream",
  });

  const impactQuery = useQuery({
    queryKey: ["lineage-impact", node?.entityType, node?.entityId],
    queryFn: () => getImpactAnalysis(node!.entityType, node!.entityId),
    enabled: !!node && activeView === "impact",
  });

  if (!node) return null;

  const activeQuery =
    activeView === "upstream" ? upstreamQuery :
    activeView === "downstream" ? downstreamQuery :
    impactQuery;

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg overflow-y-auto z-10">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white truncate">
              {node.entityName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {node.entityType.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1 mt-3">
          {([
            { id: "upstream" as const, icon: ArrowUpRight, label: "Upstream" },
            { id: "downstream" as const, icon: ArrowDownRight, label: "Downstream" },
            { id: "impact" as const, icon: AlertTriangle, label: "Impact" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                activeView === tab.id
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {activeQuery.isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {activeQuery.error && (
          <p className="text-xs text-red-500 py-4 text-center">
            Failed to load data
          </p>
        )}

        {/* Upstream/Downstream view */}
        {(activeView === "upstream" || activeView === "downstream") && !activeQuery.isLoading && !activeQuery.error && (
          <div>
            {(() => {
              const data = activeView === "upstream" ? upstreamQuery.data : downstreamQuery.data;
              if (!data) return null;
              const { graph, entity_count_by_type } = data;
              const entities = graph.nodes ?? [];

              return (
                <div className="space-y-3">
                  {/* Counts */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(entity_count_by_type).map(([type, count]) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      >
                        {count} {type.replace("_", " ")}{count !== 1 ? "s" : ""}
                      </span>
                    ))}
                  </div>

                  {/* Entity list */}
                  {entities.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">
                      No {activeView} entities found.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {entities.map((e) => (
                        <li
                          key={`${e.entity_type}:${e.entity_id}`}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800/50 text-xs"
                        >
                          <span className="capitalize text-gray-400 w-20 flex-shrink-0">
                            {e.entity_type.replace("_", " ")}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 truncate">
                            {e.entity_name ?? e.entity_id}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Impact view */}
        {activeView === "impact" && !activeQuery.isLoading && !activeQuery.error && impactQuery.data && (
          <div className="space-y-3">
            {/* Risk badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Risk Level:</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${RISK_COLORS[impactQuery.data.risk_level] ?? RISK_COLORS.low}`}>
                {impactQuery.data.risk_level.toUpperCase()}
              </span>
              <span className="text-xs text-gray-400">
                ({impactQuery.data.total_affected} affected)
              </span>
            </div>

            {/* Affected entities by category */}
            {impactQuery.data.affected_endpoints.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Endpoints ({impactQuery.data.affected_endpoints.length})
                </h4>
                <ul className="space-y-1">
                  {impactQuery.data.affected_endpoints.map((e) => (
                    <li key={e.entity_id} className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 truncate">
                      {e.entity_name ?? e.entity_id}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {impactQuery.data.affected_models.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Models ({impactQuery.data.affected_models.length})
                </h4>
                <ul className="space-y-1">
                  {impactQuery.data.affected_models.map((e) => (
                    <li key={e.entity_id} className="text-xs px-2 py-1 rounded bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 truncate">
                      {e.entity_name ?? e.entity_id}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {impactQuery.data.affected_training_sheets.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Training Sheets ({impactQuery.data.affected_training_sheets.length})
                </h4>
                <ul className="space-y-1">
                  {impactQuery.data.affected_training_sheets.map((e) => (
                    <li key={e.entity_id} className="text-xs px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 truncate">
                      {e.entity_name ?? e.entity_id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
