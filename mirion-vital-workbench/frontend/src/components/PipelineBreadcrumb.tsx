/**
 * PipelineBreadcrumb - The core navigation component showing the 7-stage lifecycle
 *
 * DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE
 *
 * Shows workflow progress with checkmarks for completed stages and
 * displays selected items (data source, template) in the breadcrumb.
 */

import { ChevronRight, Check } from "lucide-react";
import { clsx } from "clsx";
import type { PipelineStage } from "../types";
import { PIPELINE_STAGES } from "../types";
import { useWorkflow } from "../context/WorkflowContext";

interface PipelineBreadcrumbProps {
  currentStage: PipelineStage;
  onStageClick: (stage: PipelineStage) => void;
}

const stageColors: Record<
  PipelineStage,
  { bg: string; text: string; border: string; completedBg: string }
> = {
  data: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-500",
    completedBg: "bg-blue-100",
  },
  label: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-500",
    completedBg: "bg-orange-100",
  },
  curate: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-500",
    completedBg: "bg-amber-100",
  },
  train: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-500",
    completedBg: "bg-green-100",
  },
  deploy: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-500",
    completedBg: "bg-cyan-100",
  },
  monitor: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-500",
    completedBg: "bg-rose-100",
  },
  improve: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-500",
    completedBg: "bg-indigo-100",
  },
};

export function PipelineBreadcrumb({
  currentStage,
  onStageClick,
}: PipelineBreadcrumbProps) {
  const { state } = useWorkflow();

  // Determine if a stage is "complete" based on workflow state
  const isStageComplete = (stageId: PipelineStage): boolean => {
    switch (stageId) {
      case "data":
        return state.selectedSource !== null;
      default:
        return false;
    }
  };

  // Get summary text for a completed stage
  const getStageSummary = (stageId: PipelineStage): string | null => {
    switch (stageId) {
      case "data":
        return state.selectedSource?.name || null;
      default:
        return null;
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-db-gray-200 dark:border-gray-700 px-4 py-3 overflow-x-auto">
      <div className="flex items-center justify-start md:justify-center gap-1 min-w-max">
        {PIPELINE_STAGES.map((stage, index) => {
          const isActive = stage.id === currentStage;
          const isComplete = isStageComplete(stage.id);
          const summary = getStageSummary(stage.id);
          const colors = stageColors[stage.id];

          return (
            <div key={stage.id} className="flex items-center">
              <button
                onClick={() => onStageClick(stage.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap",
                  "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1",
                  isActive
                    ? `${colors.bg} ${colors.text} border-2 ${colors.border} shadow-sm`
                    : isComplete
                      ? `${colors.completedBg} ${colors.text} border border-transparent`
                      : "text-db-gray-500 hover:text-db-gray-700 hover:bg-db-gray-50 dark:hover:bg-gray-800",
                )}
                title={
                  summary
                    ? `${stage.description} - Selected: ${summary}`
                    : stage.description
                }
              >
                {isComplete && !isActive && (
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span>{stage.label}</span>
                {summary && !isActive && (
                  <span className="text-xs opacity-75 max-w-[80px] truncate hidden lg:inline">
                    ({summary})
                  </span>
                )}
              </button>

              {index < PIPELINE_STAGES.length - 1 && (
                <ChevronRight className="w-4 h-4 text-db-gray-300 mx-0.5 sm:mx-1 hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
