import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import type { ConceptNodeData } from "./useSemanticGraphLayout";
import type { ConceptType } from "../../types/governance";

const ACCENT_COLORS: Record<ConceptType, string> = {
  entity: "bg-blue-500",
  event: "bg-amber-500",
  metric: "bg-green-500",
  dimension: "bg-purple-500",
};

const BADGE_COLORS: Record<ConceptType, string> = {
  entity: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  event: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  metric: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  dimension: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
};

const TYPE_LABELS: Record<ConceptType, string> = {
  entity: "Entity",
  event: "Event",
  metric: "Metric",
  dimension: "Dimension",
};

function ConceptNode({ data }: NodeProps<ConceptNodeData>) {
  return (
    <div className="flex bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden w-[220px] h-[80px] cursor-pointer hover:shadow-md transition-shadow">
      <div className={`w-1.5 flex-shrink-0 ${ACCENT_COLORS[data.conceptType]}`} />
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-2 !h-2 !border-white !-left-1" />
      <div className="flex-1 p-2.5 min-w-0 flex flex-col justify-center">
        <div className="font-semibold text-sm text-gray-800 dark:text-white truncate leading-tight">
          {data.name}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${BADGE_COLORS[data.conceptType]}`}>
            {TYPE_LABELS[data.conceptType]}
          </span>
          {data.propertyCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {data.propertyCount} prop{data.propertyCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-2 !h-2 !border-white !-right-1" />
    </div>
  );
}

export default memo(ConceptNode);
