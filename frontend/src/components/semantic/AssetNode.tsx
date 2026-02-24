import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import { Database, Hash, FileText, FileCheck, Package } from "lucide-react";
import type { AssetNodeData } from "./useSemanticGraphLayout";

const ICON_MAP: Record<string, typeof Database> = {
  table: Database,
  column: Hash,
  sheet: FileText,
  contract: FileCheck,
  product: Package,
};

const TYPE_LABELS: Record<string, string> = {
  table: "Table",
  column: "Column",
  sheet: "Sheet",
  contract: "Contract",
  product: "Product",
};

function AssetNode({ data }: NodeProps<AssetNodeData>) {
  const Icon = ICON_MAP[data.targetType] ?? Database;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 w-[180px] h-[56px] flex items-center gap-2 px-3 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
      <Handle type="target" position={Position.Left} className="!bg-indigo-500 !w-2 !h-2 !border-white !-left-1" />
      <Icon className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
          {data.targetName}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-gray-400 dark:text-gray-600">
            {TYPE_LABELS[data.targetType] ?? data.targetType}
          </span>
          <span className="text-[10px] px-1 py-px rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            {data.linkCount} link{data.linkCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(AssetNode);
