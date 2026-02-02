/**
 * APX-style App Layout
 *
 * Main application shell with collapsible sidebar navigation.
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

const STAGES: StageConfig[] = [
  {
    id: "data",
    label: "Data",
    icon: Database,
    color: "text-blue-500",
    description: "Select data source",
  },
  {
    id: "template",
    label: "Template",
    icon: FileText,
    color: "text-purple-500",
    description: "Build prompt templates",
  },
  {
    id: "curate",
    label: "Curate",
    icon: ClipboardList,
    color: "text-amber-500",
    description: "Review and curate data",
  },
  {
    id: "label",
    label: "Label",
    icon: Tag,
    color: "text-orange-500",
    description: "Label training data",
  },
  {
    id: "train",
    label: "Train",
    icon: Cpu,
    color: "text-green-500",
    description: "Train models",
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
          Databits Workbench
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
        !open && "mx-auto"
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
        {STAGES.map((stage) => {
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
// Quick Actions (Examples, Optimize)
// ============================================================================

interface QuickActionsProps {
  showExamples: boolean;
  onToggleExamples: () => void;
  onOpenOptimize?: () => void;
}

function QuickActions({
  showExamples,
  onToggleExamples,
  onOpenOptimize,
}: QuickActionsProps) {
  const { open } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Tools</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={showExamples}
            tooltip="Example Store"
            onClick={onToggleExamples}
          >
            <BookOpen
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                showExamples ? "text-purple-500" : "text-db-gray-500"
              )}
            />
            {open && <span>Example Store</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        {onOpenOptimize && (
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="DSPy Optimize" onClick={onOpenOptimize}>
              <Beaker className="w-5 h-5 flex-shrink-0 text-db-gray-500" />
              {open && <span>DSPy Optimize</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
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
  showExamples: boolean;
  onToggleExamples: () => void;
  onOpenOptimize?: () => void;
}

export function AppLayout({
  children,
  currentStage,
  onStageClick,
  completedStages = [],
  currentUser,
  workspaceUrl,
  showExamples,
  onToggleExamples,
  onOpenOptimize,
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
          <QuickActions
            showExamples={showExamples}
            onToggleExamples={onToggleExamples}
            onOpenOptimize={onOpenOptimize}
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
            {STAGES.find((s) => s.id === currentStage)?.description}
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
