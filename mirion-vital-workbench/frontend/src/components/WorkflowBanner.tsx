/**
 * WorkflowBanner - Unified banner component for Deploy, Monitor, and Improve stages
 *
 * Shows current workflow selections (data source, template) and navigation buttons
 * with stage-specific theming.
 */

import { ChevronLeft, ChevronRight, Database, FileCode, RotateCcw } from "lucide-react";
import { useWorkflow } from "../context/WorkflowContext";

// ============================================================================
// Types
// ============================================================================

type WorkflowBannerStage = "data" | "deploy" | "monitor" | "improve";

interface WorkflowBannerProps {
  stage: WorkflowBannerStage;
}

// ============================================================================
// Stage Configuration
// ============================================================================

const STAGE_CONFIG: Record<
  WorkflowBannerStage,
  {
    gradient: string;
    border: string;
    iconColor: string;
    textPrimary: string;
    textSecondary: string;
    chevronColor: string;
    backButtonHover: string;
    nextButtonBg: string;
    nextButtonHover: string;
    backText: string;
    nextText: string;
    nextIcon?: typeof ChevronRight | typeof RotateCcw;
  }
> = {
  data: {
    gradient: "from-blue-50 to-indigo-50",
    border: "border-blue-200",
    iconColor: "text-blue-600",
    textPrimary: "text-blue-600",
    textSecondary: "text-blue-800",
    chevronColor: "text-blue-400",
    backButtonHover: "hover:bg-blue-100",
    nextButtonBg: "bg-blue-600",
    nextButtonHover: "hover:bg-blue-700",
    backText: "Back",
    nextText: "Continue to Generate",
  },
  deploy: {
    gradient: "from-cyan-50 to-blue-50",
    border: "border-cyan-200",
    iconColor: "text-cyan-600",
    textPrimary: "text-cyan-600",
    textSecondary: "text-cyan-800",
    chevronColor: "text-cyan-400",
    backButtonHover: "hover:bg-cyan-100",
    nextButtonBg: "bg-cyan-600",
    nextButtonHover: "hover:bg-cyan-700",
    backText: "Back to Train",
    nextText: "Continue to Monitor",
  },
  monitor: {
    gradient: "from-rose-50 to-pink-50",
    border: "border-rose-200",
    iconColor: "text-rose-600",
    textPrimary: "text-rose-600",
    textSecondary: "text-rose-800",
    chevronColor: "text-rose-400",
    backButtonHover: "hover:bg-rose-100",
    nextButtonBg: "bg-rose-600",
    nextButtonHover: "hover:bg-rose-700",
    backText: "Back to Deploy",
    nextText: "Continue to Improve",
  },
  improve: {
    gradient: "from-indigo-50 to-purple-50",
    border: "border-indigo-200",
    iconColor: "text-indigo-600",
    textPrimary: "text-indigo-600",
    textSecondary: "text-indigo-800",
    chevronColor: "text-indigo-400",
    backButtonHover: "hover:bg-indigo-100",
    nextButtonBg: "bg-indigo-600",
    nextButtonHover: "hover:bg-indigo-700",
    backText: "Back to Monitor",
    nextText: "Start New Cycle",
    nextIcon: RotateCcw,
  },
};

// ============================================================================
// WorkflowBanner Component
// ============================================================================

export function WorkflowBanner({ stage }: WorkflowBannerProps) {
  const { state, goToPreviousStage, goToNextStage, resetWorkflow, setCurrentStage } = useWorkflow();
  const config = STAGE_CONFIG[stage];

  const handleNextClick = () => {
    if (stage === "improve") {
      resetWorkflow();
      setCurrentStage("data");
    } else {
      goToNextStage();
    }
  };

  const NextIcon = config.nextIcon || ChevronRight;

  return (
    <div className={`bg-gradient-to-r ${config.gradient} border ${config.border} rounded-lg p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Data source */}
          {state.selectedSource && (
            <div className="flex items-center gap-2">
              <Database className={`w-4 h-4 ${config.iconColor}`} />
              <div>
                <div className={`text-xs ${config.textPrimary} font-medium`}>
                  Data Source
                </div>
                <div className={`text-sm ${config.textSecondary}`}>
                  {state.selectedSource.name}
                </div>
              </div>
            </div>
          )}

          {/* Template */}
          {state.selectedTemplate && (
            <>
              <ChevronRight className={`w-4 h-4 ${config.chevronColor}`} />
              <div className="flex items-center gap-2">
                <FileCode className={`w-4 h-4 ${config.iconColor}`} />
                <div>
                  <div className={`text-xs ${config.textPrimary} font-medium`}>
                    Template
                  </div>
                  <div className={`text-sm ${config.textSecondary}`}>
                    {state.selectedTemplate.name}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousStage}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm ${config.textPrimary} ${config.backButtonHover} rounded-lg transition-colors`}
          >
            <ChevronLeft className="w-4 h-4" />
            {config.backText}
          </button>
          <button
            onClick={handleNextClick}
            className={`flex items-center gap-1 px-4 py-1.5 text-sm ${config.nextButtonBg} text-white ${config.nextButtonHover} rounded-lg transition-colors`}
          >
            {config.nextText}
            <NextIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
