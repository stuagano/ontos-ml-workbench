import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import {
  FileSpreadsheet,
  FileCode,
  GraduationCap,
  Brain,
  Radio,
} from "lucide-react";
import type { LineageEntityType } from "../../types/governance";

export interface LineageNodeData {
  entityType: LineageEntityType;
  entityId: string;
  entityName: string;
  metadata: Record<string, unknown> | null;
}

const ENTITY_CONFIG: Record<
  LineageEntityType,
  { icon: typeof FileSpreadsheet; accent: string; badge: string; label: string }
> = {
  sheet: {
    icon: FileSpreadsheet,
    accent: "bg-teal-500",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
    label: "Sheet",
  },
  template: {
    icon: FileCode,
    accent: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    label: "Template",
  },
  training_sheet: {
    icon: GraduationCap,
    accent: "bg-cyan-500",
    badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
    label: "Training Sheet",
  },
  model: {
    icon: Brain,
    accent: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
    label: "Model",
  },
  endpoint: {
    icon: Radio,
    accent: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    label: "Endpoint",
  },
};

function LineageNode({ data }: NodeProps<LineageNodeData>) {
  const config = ENTITY_CONFIG[data.entityType] ?? ENTITY_CONFIG.sheet;
  const Icon = config.icon;

  return (
    <div className="flex bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden w-[220px] h-[80px] cursor-pointer hover:shadow-md transition-shadow">
      <div className={`w-1.5 flex-shrink-0 ${config.accent}`} />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !w-2 !h-2 !border-white !-left-1"
      />
      <div className="flex-1 p-2.5 min-w-0 flex items-center gap-2">
        <Icon className="w-5 h-5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="font-semibold text-sm text-gray-800 dark:text-white truncate leading-tight">
            {data.entityName}
          </div>
          <span
            className={`mt-1 inline-block w-fit px-1.5 py-0.5 text-[10px] rounded font-medium ${config.badge}`}
          >
            {config.label}
          </span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-indigo-500 !w-2 !h-2 !border-white !-right-1"
      />
    </div>
  );
}

export default memo(LineageNode);
