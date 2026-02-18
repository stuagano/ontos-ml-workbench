/**
 * APX-style App Layout
 *
 * Main application shell for Ontos ML Workbench with collapsible sidebar navigation.
 * Replaces Header + PipelineBreadcrumb pattern with a unified sidebar.
 */

import { ReactNode } from "react";
import {
  Database,
  FileText,
  ClipboardList,
  Tag,
  Cpu,
  Rocket,
  Activity,
  RefreshCw,
  BookOpen,
  Beaker,
  ExternalLink,
  User,
  Sun,
  Moon,
  Monitor,
  Check,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { clsx } from "clsx";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "../ui/sidebar";
import { useTheme } from "../../hooks/useTheme";
import type { PipelineStage } from "../../types";

// ============================================================================
// Stage Configuration
// ============================================================================

interface StageConfig {
  id: PipelineStage;
  label: string;
  icon: typeof Database;
  color: string;
  description: string;
}

const LIFECYCLE_STAGES: StageConfig[] = [
  {
    id: "data",
    label: "Datasets",
    icon: Database,
    color: "text-blue-500",
    description: "Create and manage data sources",
  },
  {
    id: "label",
    label: "Label",
    icon: Tag,
    color: "text-orange-500",
    description: "Review and label Q&A pairs",
  },
  {
    id: "curate",
    label: "Curate",
    icon: ClipboardList,
    color: "text-amber-500",
    description: "Build training and validation sets",
  },
  {
    id: "train",
    label: "Train",
    icon: Cpu,
    color: "text-green-500",
    description: "Fine-tune models with curated data",
  },
  {
    id: "deploy",
    label: "Deploy",
    icon: Rocket,
    color: "text-cyan-500",
    description: "Deploy to production",
  },
  {
    id: "monitor",
    label: "Monitor",
    icon: Activity,
    color: "text-rose-500",
    description: "Monitor performance",
  },
  {
    id: "improve",
    label: "Improve",
    icon: RefreshCw,
    color: "text-indigo-500",
    description: "Continuous improvement",
  },
];

// Tools are separate from workflow stages
const TOOLS_CONFIG = {
  promptTemplates: {
    id: "prompt-templates",
    label: "Prompt Templates",
    icon: FileText,
    color: "text-purple-500",
    description: "Manage reusable prompt templates",
  },
  exampleStore: {
    id: "example-store",
    label: "Example Store",
    icon: BookOpen,
    color: "text-emerald-500",
    description: "Dynamic few-shot examples",
  },
  dspyOptimizer: {
    id: "dspy-optimizer",
    label: "DSPy Optimizer",
    icon: Beaker,
    color: "text-pink-500",
    description: "Optimize prompts with DSPy",
  },
  canonicalLabeling: {
    id: "canonical-labeling",
    label: "Canonical Labels",
    icon: Tag,
    color: "text-orange-500",
    description: "Label source data directly",
  },
  dataQuality: {
    id: "data-quality",
    label: "Data Quality",
    icon: ShieldCheck,
    color: "text-teal-500",
    description: "DQX data quality checks & monitoring",
  },
  labelingJobs: {
    id: "labeling-jobs",
    label: "Labeling Jobs",
    icon: ClipboardList,
    color: "text-sky-500",
    description: "Manage labeling workflows",
  },
  labelSets: {
    id: "label-sets",
    label: "Label Sets",
    icon: Layers,
    color: "text-lime-500",
    description: "Manage label set configurations",
  },
};

// ============================================================================
// Logo Component
// ============================================================================

function Logo() {
  const { open } = useSidebar();

  return (
    <div className="flex items-center gap-3">
      <Database className="w-7 h-7 text-db-orange flex-shrink-0" />
      {open && (
        <span className="font-semibold text-db-gray-800 dark:text-white truncate">
          Ontos ML Workbench
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Theme Toggle
// ============================================================================

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { open } = useSidebar();
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        "p-2 rounded-lg text-db-gray-600 dark:text-gray-400",
        "hover:bg-db-gray-100 dark:hover:bg-gray-800 transition-colors",
        !open && "mx-auto",
      )}
      title={`Theme: ${theme}`}
    >
      <ThemeIcon className="w-5 h-5" />
    </button>
  );
}

// ============================================================================
// User Footer
// ============================================================================

interface UserFooterProps {
  currentUser: string;
  workspaceUrl?: string;
}

function UserFooter({ currentUser, workspaceUrl }: UserFooterProps) {
  const { open } = useSidebar();

  if (!open) {
    return (
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle />
        <button
          className="p-2 text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300"
          title={currentUser}
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 text-sm text-db-gray-600 dark:text-gray-400 truncate">
        <User className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{currentUser}</span>
      </div>
      <div className="flex items-center gap-1">
        {workspaceUrl && (
          <button
            onClick={() => window.open(workspaceUrl, "_blank")}
            className="p-2 text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300"
            title="Open workspace"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}

// ============================================================================
// Stage Navigation
// ============================================================================

interface StageNavProps {
  currentStage: PipelineStage;
  onStageClick: (stage: PipelineStage) => void;
  completedStages?: PipelineStage[];
}

function StageNav({
  currentStage,
  onStageClick,
  completedStages = [],
}: StageNavProps) {
  const { open } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Lifecycle</SidebarGroupLabel>
      <SidebarMenu>
        {LIFECYCLE_STAGES.map((stage) => {
          const Icon = stage.icon;
          const isActive = stage.id === currentStage;
          const isComplete = completedStages.includes(stage.id);

          return (
            <SidebarMenuItem key={stage.id}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={stage.description}
                onClick={() => onStageClick(stage.id)}
              >
                <Icon className={clsx("w-5 h-5 flex-shrink-0", stage.color)} />
                {open && (
                  <>
                    <span className="flex-1 text-left">{stage.label}</span>
                    {isComplete && !isActive && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

// ============================================================================
// Tools Section (Asset Management - Not Workflow Stages)
// ============================================================================

interface ToolsNavProps {
  showPromptTemplates: boolean;
  onTogglePromptTemplates: () => void;
  showExamples: boolean;
  onToggleExamples: () => void;
  showDSPyOptimizer: boolean;
  onToggleDSPyOptimizer: () => void;
  showCanonicalLabeling: boolean;
  onToggleCanonicalLabeling: () => void;
  showDataQuality: boolean;
  onToggleDataQuality: () => void;
  showLabelingJobs: boolean;
  onToggleLabelingJobs: () => void;
  showLabelSets: boolean;
  onToggleLabelSets: () => void;
}

function ToolsNav({
  showPromptTemplates,
  onTogglePromptTemplates,
  showExamples,
  onToggleExamples,
  showDSPyOptimizer,
  onToggleDSPyOptimizer,
  showCanonicalLabeling,
  onToggleCanonicalLabeling,
  showDataQuality,
  onToggleDataQuality,
  showLabelingJobs,
  onToggleLabelingJobs,
  showLabelSets,
  onToggleLabelSets,
}: ToolsNavProps) {
  const { open } = useSidebar();
  const PromptTemplatesIcon = TOOLS_CONFIG.promptTemplates.icon;
  const ExampleStoreIcon = TOOLS_CONFIG.exampleStore.icon;
  const DSPyIcon = TOOLS_CONFIG.dspyOptimizer.icon;
  const CanonicalLabelingIcon = TOOLS_CONFIG.canonicalLabeling.icon;
  const DataQualityIcon = TOOLS_CONFIG.dataQuality.icon;
  const LabelingJobsIcon = TOOLS_CONFIG.labelingJobs.icon;
  const LabelSetsIcon = TOOLS_CONFIG.labelSets.icon;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Tools</SidebarGroupLabel>
      <SidebarMenu>
        {/* Prompt Templates */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={showPromptTemplates}
            tooltip={TOOLS_CONFIG.promptTemplates.description}
            onClick={onTogglePromptTemplates}
          >
            <PromptTemplatesIcon
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                showPromptTemplates
                  ? TOOLS_CONFIG.promptTemplates.color
                  : "text-db-gray-500",
              )}
            />
            {open && <span>{TOOLS_CONFIG.promptTemplates.label}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Example Store */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={showExamples}
            tooltip={TOOLS_CONFIG.exampleStore.description}
            onClick={onToggleExamples}
          >
            <ExampleStoreIcon
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                showExamples
                  ? TOOLS_CONFIG.exampleStore.color
                  : "text-db-gray-500",
              )}
            />
            {open && <span>{TOOLS_CONFIG.exampleStore.label}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* DSPy Optimizer */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={showDSPyOptimizer}
            tooltip={TOOLS_CONFIG.dspyOptimizer.description}
            onClick={onToggleDSPyOptimizer}
          >
            <DSPyIcon
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                showDSPyOptimizer
                  ? TOOLS_CONFIG.dspyOptimizer.color
                  : "text-db-gray-500",
              )}
            />
            {open && <span>{TOOLS_CONFIG.dspyOptimizer.label}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Canonical Labeling */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={showCanonicalLabeling}
            tooltip={TOOLS_CONFIG.canonicalLabeling.description}
            onClick={onToggleCanonicalLabeling}
          >
            <CanonicalLabelingIcon
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                showCanonicalLabeling
                  ? TOOLS_CONFIG.canonicalLabeling.color
                  : "text-db-gray-500",
              )}
            />
            {open && <span>{TOOLS_CONFIG.canonicalLabeling.label}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Data Quality */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={showDataQuality}
            tooltip={TOOLS_CONFIG.dataQuality.description}
            onClick={onToggleDataQuality}
          >
            <DataQualityIcon
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                showDataQuality
                  ? TOOLS_CONFIG.dataQuality.color
                  : "text-db-gray-500",
              )}
            />
            {open && <span>{TOOLS_CONFIG.dataQuality.label}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Labeling Jobs */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={showLabelingJobs}
            tooltip={TOOLS_CONFIG.labelingJobs.description}
            onClick={onToggleLabelingJobs}
          >
            <LabelingJobsIcon
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                showLabelingJobs
                  ? TOOLS_CONFIG.labelingJobs.color
                  : "text-db-gray-500",
              )}
            />
            {open && <span>{TOOLS_CONFIG.labelingJobs.label}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Label Sets */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={showLabelSets}
            tooltip={TOOLS_CONFIG.labelSets.description}
            onClick={onToggleLabelSets}
          >
            <LabelSetsIcon
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                showLabelSets
                  ? TOOLS_CONFIG.labelSets.color
                  : "text-db-gray-500",
              )}
            />
            {open && <span>{TOOLS_CONFIG.labelSets.label}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}

// ============================================================================
// Main Layout
// ============================================================================

interface AppLayoutProps {
  children: ReactNode;
  currentStage: PipelineStage;
  onStageClick: (stage: PipelineStage) => void;
  completedStages?: PipelineStage[];
  currentUser: string;
  workspaceUrl?: string;
  showPromptTemplates: boolean;
  onTogglePromptTemplates: () => void;
  showExamples: boolean;
  onToggleExamples: () => void;
  showDSPyOptimizer: boolean;
  onToggleDSPyOptimizer: () => void;
  showCanonicalLabeling: boolean;
  onToggleCanonicalLabeling: () => void;
  showDataQuality: boolean;
  onToggleDataQuality: () => void;
  showLabelingJobs: boolean;
  onToggleLabelingJobs: () => void;
  showLabelSets: boolean;
  onToggleLabelSets: () => void;
}

export function AppLayout({
  children,
  currentStage,
  onStageClick,
  completedStages = [],
  currentUser,
  workspaceUrl,
  showPromptTemplates,
  onTogglePromptTemplates,
  showExamples,
  onToggleExamples,
  showDSPyOptimizer,
  onToggleDSPyOptimizer,
  showCanonicalLabeling,
  onToggleCanonicalLabeling,
  showDataQuality,
  onToggleDataQuality,
  showLabelingJobs,
  onToggleLabelingJobs,
  showLabelSets,
  onToggleLabelSets,
}: AppLayoutProps) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>

        <SidebarContent>
          <StageNav
            currentStage={currentStage}
            onStageClick={onStageClick}
            completedStages={completedStages}
          />
          <ToolsNav
            showPromptTemplates={showPromptTemplates}
            onTogglePromptTemplates={onTogglePromptTemplates}
            showExamples={showExamples}
            onToggleExamples={onToggleExamples}
            showDSPyOptimizer={showDSPyOptimizer}
            onToggleDSPyOptimizer={onToggleDSPyOptimizer}
            showCanonicalLabeling={showCanonicalLabeling}
            onToggleCanonicalLabeling={onToggleCanonicalLabeling}
            showDataQuality={showDataQuality}
            onToggleDataQuality={onToggleDataQuality}
            showLabelingJobs={showLabelingJobs}
            onToggleLabelingJobs={onToggleLabelingJobs}
            showLabelSets={showLabelSets}
            onToggleLabelSets={onToggleLabelSets}
          />
        </SidebarContent>

        <SidebarFooter>
          <UserFooter currentUser={currentUser} workspaceUrl={workspaceUrl} />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-db-gray-200 dark:border-gray-700 h-14 flex items-center px-4">
          <SidebarTrigger />
          <div className="ml-4 text-sm font-medium text-db-gray-700 dark:text-gray-300">
            {LIFECYCLE_STAGES.find((s) => s.id === currentStage)?.description}
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-db-gray-50 dark:bg-gray-950">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppLayout;
