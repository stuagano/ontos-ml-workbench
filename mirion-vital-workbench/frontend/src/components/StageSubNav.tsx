/**
 * StageSubNav - Secondary navigation within each pipeline stage
 *
 * Provides toggle between "Browse Library" (list existing) and "Create New" modes.
 * Each stage can have different labels based on context.
 */

import { Library, Plus, FolderOpen, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import type { PipelineStage } from "../types";

export type StageMode = "browse" | "create";

interface StageSubNavProps {
  stage: PipelineStage;
  mode: StageMode;
  onModeChange: (mode: StageMode) => void;
  browseCount?: number;  // Optional count of items in library
}

// Stage-specific labels for the modes
const stageLabels: Record<PipelineStage, { browse: string; create: string; browseIcon: typeof Library; createIcon: typeof Plus }> = {
  data: {
    browse: "Unity Catalog",
    create: "New Sheet",
    browseIcon: FolderOpen,
    createIcon: Plus,
  },
  template: {
    browse: "Template Library",
    create: "New Template",
    browseIcon: Library,
    createIcon: Plus,
  },
  curate: {
    browse: "Curation Queue",
    create: "Add Items",
    browseIcon: Library,
    createIcon: Plus,
  },
  label: {
    browse: "Labeling Tasks",
    create: "New Task",
    browseIcon: Library,
    createIcon: Plus,
  },
  train: {
    browse: "Assemblies",
    create: "Configure Training",
    browseIcon: Library,
    createIcon: Sparkles,
  },
  deploy: {
    browse: "Deployments",
    create: "New Deployment",
    browseIcon: Library,
    createIcon: Plus,
  },
  monitor: {
    browse: "Dashboards",
    create: "New Monitor",
    browseIcon: Library,
    createIcon: Plus,
  },
  improve: {
    browse: "Example Store",
    create: "Add Examples",
    browseIcon: Library,
    createIcon: Plus,
  },
};

// Stage colors (matching PipelineBreadcrumb)
const stageColors: Record<PipelineStage, { active: string; inactive: string }> = {
  data: { active: "bg-blue-600 text-white", inactive: "text-blue-700 hover:bg-blue-50" },
  template: { active: "bg-purple-600 text-white", inactive: "text-purple-700 hover:bg-purple-50" },
  curate: { active: "bg-amber-600 text-white", inactive: "text-amber-700 hover:bg-amber-50" },
  label: { active: "bg-orange-600 text-white", inactive: "text-orange-700 hover:bg-orange-50" },
  train: { active: "bg-green-600 text-white", inactive: "text-green-700 hover:bg-green-50" },
  deploy: { active: "bg-cyan-600 text-white", inactive: "text-cyan-700 hover:bg-cyan-50" },
  monitor: { active: "bg-rose-600 text-white", inactive: "text-rose-700 hover:bg-rose-50" },
  improve: { active: "bg-indigo-600 text-white", inactive: "text-indigo-700 hover:bg-indigo-50" },
};

export function StageSubNav({ stage, mode, onModeChange, browseCount }: StageSubNavProps) {
  const labels = stageLabels[stage];
  const colors = stageColors[stage];
  const BrowseIcon = labels.browseIcon;
  const CreateIcon = labels.createIcon;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-db-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-db-gray-200 dark:border-gray-600 p-1 bg-db-gray-50 dark:bg-gray-700">
          <button
            onClick={() => onModeChange("browse")}
            className={clsx(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === "browse" ? colors.active : colors.inactive
            )}
          >
            <BrowseIcon className="w-4 h-4" />
            {labels.browse}
            {browseCount !== undefined && mode === "browse" && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                {browseCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onModeChange("create")}
            className={clsx(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === "create" ? colors.active : colors.inactive
            )}
          >
            <CreateIcon className="w-4 h-4" />
            {labels.create}
          </button>
        </div>
      </div>
    </div>
  );
}
