import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import {
  FileSpreadsheet,
  FileCode,
  GraduationCap,
  Brain,
  Radio,
  Tag,
  FolderTree,
  Package,
  FileCheck,
  ClipboardList,
  ListChecks,
  PenLine,
  BarChart3,
  Users,
  Briefcase,
  SearchX,
  Pencil,
  ShieldCheck,
  BookOpen,
  Plug,
  FlaskConical,
  MessageSquare,
  UserCheck,
  UserPlus,
  KeyRound,
  Shield,
  Activity,
  ThumbsUp,
  Truck,
  PackageCheck,
  Server,
  Globe,
  Lightbulb,
  Hash,
  Scale,
  ClipboardCheck,
  GitBranch,
  Play,
  Database,
  RefreshCw,
  Key,
  Wrench,
  Zap,
  Cog,
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
  canonical_label: {
    icon: Tag,
    accent: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    label: "Canonical Label",
  },
  domain: {
    icon: FolderTree,
    accent: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    label: "Domain",
  },
  data_product: {
    icon: Package,
    accent: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
    label: "Data Product",
  },
  data_contract: {
    icon: FileCheck,
    accent: "bg-slate-500",
    badge: "bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-400",
    label: "Data Contract",
  },
  labeling_job: {
    icon: ClipboardList,
    accent: "bg-lime-500",
    badge: "bg-lime-50 text-lime-700 dark:bg-lime-950 dark:text-lime-400",
    label: "Labeling Job",
  },
  labeling_task: {
    icon: ListChecks,
    accent: "bg-pink-500",
    badge: "bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
    label: "Labeling Task",
  },
  labeled_item: {
    icon: PenLine,
    accent: "bg-fuchsia-500",
    badge: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-400",
    label: "Labeled Item",
  },
  model_evaluation: {
    icon: BarChart3,
    accent: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
    label: "Evaluation",
  },
  team: {
    icon: Users,
    accent: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    label: "Team",
  },
  project: {
    icon: Briefcase,
    accent: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    label: "Project",
  },
  identified_gap: {
    icon: SearchX,
    accent: "bg-red-500",
    badge: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    label: "Identified Gap",
  },
  annotation_task: {
    icon: Pencil,
    accent: "bg-yellow-500",
    badge: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    label: "Annotation Task",
  },
  asset_review: {
    icon: ShieldCheck,
    accent: "bg-green-500",
    badge: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
    label: "Asset Review",
  },
  example: {
    icon: BookOpen,
    accent: "bg-stone-500",
    badge: "bg-stone-50 text-stone-700 dark:bg-stone-950 dark:text-stone-400",
    label: "Example",
  },
  connector: {
    icon: Plug,
    accent: "bg-zinc-500",
    badge: "bg-zinc-50 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-400",
    label: "Connector",
  },
  dqx_quality_result: {
    icon: FlaskConical,
    accent: "bg-teal-600",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
    label: "Quality Check",
  },
  qa_pair: {
    icon: MessageSquare,
    accent: "bg-cyan-600",
    badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
    label: "Q&A Pair",
  },
  team_member: {
    icon: UserCheck,
    accent: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    label: "Team Member",
  },
  project_member: {
    icon: UserPlus,
    accent: "bg-purple-400",
    badge: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    label: "Project Member",
  },
  user_role_assignment: {
    icon: KeyRound,
    accent: "bg-amber-600",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    label: "Role Assignment",
  },
  app_role: {
    icon: Shield,
    accent: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    label: "App Role",
  },
  endpoint_metric: {
    icon: Activity,
    accent: "bg-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    label: "Endpoint Metric",
  },
  feedback_item: {
    icon: ThumbsUp,
    accent: "bg-orange-600",
    badge: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    label: "Feedback",
  },
  delivery_mode: {
    icon: Truck,
    accent: "bg-slate-600",
    badge: "bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-400",
    label: "Delivery Mode",
  },
  delivery_record: {
    icon: PackageCheck,
    accent: "bg-green-600",
    badge: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
    label: "Delivery Record",
  },
  endpoint_registry: {
    icon: Server,
    accent: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    label: "Endpoint Registry",
  },
  semantic_model: {
    icon: Globe,
    accent: "bg-indigo-600",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
    label: "Semantic Model",
  },
  semantic_concept: {
    icon: Lightbulb,
    accent: "bg-yellow-600",
    badge: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    label: "Concept",
  },
  semantic_property: {
    icon: Hash,
    accent: "bg-gray-500",
    badge: "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400",
    label: "Property",
  },
  compliance_policy: {
    icon: Scale,
    accent: "bg-red-600",
    badge: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    label: "Policy",
  },
  policy_evaluation: {
    icon: ClipboardCheck,
    accent: "bg-red-400",
    badge: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    label: "Policy Eval",
  },
  workflow: {
    icon: GitBranch,
    accent: "bg-violet-600",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    label: "Workflow",
  },
  workflow_execution: {
    icon: Play,
    accent: "bg-violet-400",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    label: "Workflow Run",
  },
  connector_asset: {
    icon: Database,
    accent: "bg-zinc-400",
    badge: "bg-zinc-50 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-400",
    label: "Connector Asset",
  },
  connector_sync: {
    icon: RefreshCw,
    accent: "bg-zinc-500",
    badge: "bg-zinc-50 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-400",
    label: "Connector Sync",
  },
  mcp_token: {
    icon: Key,
    accent: "bg-sky-600",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
    label: "MCP Token",
  },
  mcp_tool: {
    icon: Wrench,
    accent: "bg-sky-400",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
    label: "MCP Tool",
  },
  mcp_invocation: {
    icon: Zap,
    accent: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
    label: "MCP Invocation",
  },
  job_run: {
    icon: Cog,
    accent: "bg-rose-400",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
    label: "Job Run",
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
