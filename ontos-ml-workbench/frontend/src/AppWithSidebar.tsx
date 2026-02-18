/**
 * Ontos ML Workbench - APX Sidebar Layout Version
 *
 * Uses collapsible sidebar navigation instead of horizontal breadcrumb.
 * Toggle USE_SIDEBAR_LAYOUT in App.tsx to switch between layouts.
 */

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { AppLayout } from "./components/apx";
import { TemplateEditor } from "./components/TemplateEditor";

// Lazy load pages - only load when needed
const SheetBuilder = lazy(() =>
  import("./pages/SheetBuilder").then((m) => ({ default: m.SheetBuilder })),
);
const TemplatePage = lazy(() =>
  import("./pages/TemplatePage").then((m) => ({ default: m.TemplatePage })),
);
const CuratePage = lazy(() =>
  import("./pages/CuratePage").then((m) => ({ default: m.CuratePage })),
);
const TrainPage = lazy(() =>
  import("./pages/TrainPage").then((m) => ({ default: m.TrainPage })),
);
const DeployPage = lazy(() =>
  import("./pages/DeployPage").then((m) => ({ default: m.DeployPage })),
);
const MonitorPage = lazy(() =>
  import("./pages/MonitorPage").then((m) => ({ default: m.MonitorPage })),
);
const ImprovePage = lazy(() =>
  import("./pages/ImprovePage").then((m) => ({ default: m.ImprovePage })),
);
const ExampleStorePage = lazy(() =>
  import("./pages/ExampleStorePage").then((m) => ({
    default: m.ExampleStorePage,
  })),
);
const CuratedDatasetsPage = lazy(() =>
  import("./pages/CuratedDatasetsPage").then((m) => ({
    default: m.CuratedDatasetsPage,
  })),
);
const CanonicalLabelingTool = lazy(() =>
  import("./components/CanonicalLabelingTool").then((m) => ({
    default: m.CanonicalLabelingTool,
  })),
);
const DataQualityPage = lazy(() =>
  import("./pages/DataQualityPage").then((m) => ({
    default: m.DataQualityPage,
  })),
);
import { getConfig } from "./services/api";
import { setWorkspaceUrl } from "./services/databricksLinks";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useToast } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  KeyboardShortcutsModal,
  useKeyboardShortcutsHelp,
} from "./components/KeyboardShortcuts";
import {
  WorkflowProvider,
  useWorkflow,
  type WorkflowStage,
} from "./context/WorkflowContext";
import type { PipelineStage, Template } from "./types";

function AppContent() {
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPromptTemplates, setShowPromptTemplates] = useState(false);
  const [showExampleStore, setShowExampleStore] = useState(false);
  const [showDSPyOptimizer, setShowDSPyOptimizer] = useState(false);
  const [showCanonicalLabeling, setShowCanonicalLabeling] = useState(false);
  const [showDataQuality, setShowDataQuality] = useState(false);
  const [datasetContext, setDatasetContext] = useState<{
    columns: Array<{ name: string; type: string }>;
    sheetName?: string;
  } | null>(null);
  const toast = useToast();
  const keyboardHelp = useKeyboardShortcutsHelp();
  const workflow = useWorkflow();

  // Map workflow stage to pipeline stage
  const currentStage = workflow.state.currentStage as PipelineStage;
  const setCurrentStage = (stage: PipelineStage) => {
    workflow.setCurrentStage(stage as WorkflowStage);
  };

  // Determine completed stages based on workflow state
  const completedStages: PipelineStage[] = [];
  if (workflow.state.selectedSource) completedStages.push("data");

  // Fetch app config
  const {
    data: config,
    isLoading: configLoading,
    error: configError,
  } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
    retry: 3,
    staleTime: Infinity,
  });

  // Set workspace URL for deep links when config loads
  useEffect(() => {
    if (config?.workspace_url) {
      setWorkspaceUrl(config.workspace_url);
    }
  }, [config?.workspace_url]);

  // Listen for custom event to create template with dataset context (auto-populate schema)
  useEffect(() => {
    const handleCreateTemplateWithContext = (event: CustomEvent) => {
      const { columns, sheetName } = event.detail;
      setDatasetContext({ columns, sheetName });
      setEditingTemplate(null);
      setShowEditor(true);
      toast.info("New Template", `Auto-populating schema from ${sheetName || "dataset"}`);
    };

    window.addEventListener(
      "createTemplateWithContext" as any,
      handleCreateTemplateWithContext as any
    );

    return () => {
      window.removeEventListener(
        "createTemplateWithContext" as any,
        handleCreateTemplateWithContext as any
      );
    };
  }, [toast]);

  // Keyboard shortcut handlers
  const handleNewTemplate = useCallback(() => {
    setEditingTemplate(null);
    setDatasetContext(null); // Clear any dataset context
    setShowEditor(true);
    toast.info("New Template", "Creating new template (Alt+N)");
  }, [toast]);

  const handleEscape = useCallback(() => {
    if (showEditor) setShowEditor(false);
    if (showPromptTemplates) setShowPromptTemplates(false);
    if (showExampleStore) setShowExampleStore(false);
    if (showDSPyOptimizer) setShowDSPyOptimizer(false);
    if (showCanonicalLabeling) setShowCanonicalLabeling(false);
    if (showDataQuality) setShowDataQuality(false);
  }, [showEditor, showPromptTemplates, showExampleStore, showDSPyOptimizer, showCanonicalLabeling, showDataQuality]);

  // Register keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      modifiers: ["alt"],
      handler: handleNewTemplate,
      description: "New template",
    },
    {
      key: "t",
      modifiers: ["alt"],
      handler: () => setShowPromptTemplates(!showPromptTemplates),
      description: "Toggle Prompt Templates",
    },
    {
      key: "e",
      modifiers: ["alt"],
      handler: () => setShowExampleStore(!showExampleStore),
      description: "Toggle Example Store",
    },
    {
      key: "d",
      modifiers: ["alt"],
      handler: () => setShowDSPyOptimizer(!showDSPyOptimizer),
      description: "Toggle DSPy Optimizer",
    },
    {
      key: "l",
      modifiers: ["alt"],
      handler: () => setShowCanonicalLabeling(!showCanonicalLabeling),
      description: "Toggle Canonical Labeling",
    },
    {
      key: "q",
      modifiers: ["alt"],
      handler: () => setShowDataQuality(!showDataQuality),
      description: "Toggle Data Quality",
    },
    {
      key: "Escape",
      handler: handleEscape,
      description: "Close modal",
      global: true,
    },
  ]);

  // Loading state
  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-db-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-db-orange mx-auto mb-4" />
          <p className="text-db-gray-600 dark:text-gray-400">
            Loading Ontos ML Workbench...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-db-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-semibold text-db-gray-800 dark:text-white mb-2">
            Connection Error
          </h2>
          <p className="text-db-gray-600 dark:text-gray-400 mb-4">
            Could not connect to the backend. Make sure the API server is
            running.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderStage = () => {
    switch (currentStage) {
      case "data":
        return <SheetBuilder />;
      case "label":
        return <CuratePage />;
      case "curate":
        // Disabled - CuratedDatasetsPage depends on Lakebase which isn't set up
        // return <CuratedDatasetsPage />;
        return <CuratePage />; // Redirect to CuratePage instead
      case "train":
        return <TrainPage />;
      case "deploy":
        return <DeployPage />;
      case "monitor":
        return <MonitorPage />;
      case "improve":
        return <ImprovePage />;
      default:
        return <SheetBuilder />;
    }
  };

  return (
    <AppLayout
      currentStage={currentStage}
      onStageClick={setCurrentStage}
      completedStages={completedStages}
      currentUser={config?.current_user || "Unknown"}
      workspaceUrl={config?.workspace_url}
      showPromptTemplates={showPromptTemplates}
      onTogglePromptTemplates={() =>
        setShowPromptTemplates(!showPromptTemplates)
      }
      showExamples={showExampleStore}
      onToggleExamples={() => setShowExampleStore(!showExampleStore)}
      showDSPyOptimizer={showDSPyOptimizer}
      onToggleDSPyOptimizer={() => setShowDSPyOptimizer(!showDSPyOptimizer)}
      showCanonicalLabeling={showCanonicalLabeling}
      onToggleCanonicalLabeling={() => setShowCanonicalLabeling(!showCanonicalLabeling)}
      showDataQuality={showDataQuality}
      onToggleDataQuality={() => setShowDataQuality(!showDataQuality)}
    >
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-db-orange" />
            </div>
          }
        >
          {renderStage()}
        </Suspense>
      </ErrorBoundary>

      {/* Template Editor Modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          datasetContext={datasetContext}
          onClose={() => {
            setShowEditor(false);
            setDatasetContext(null);
          }}
          onSaved={() => {
            setShowEditor(false);
            setEditingTemplate(null);
            setDatasetContext(null);
          }}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={keyboardHelp.isOpen}
        onClose={keyboardHelp.close}
      />

      {/* Prompt Templates Tool (overlays entire view) */}
      {showPromptTemplates && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <TemplatePage
              onClose={() => setShowPromptTemplates(false)}
              onEditTemplate={(template) => {
                setEditingTemplate(template);
                setShowEditor(true);
              }}
            />
          </Suspense>
        </div>
      )}

      {/* Example Store Tool (overlays entire view) */}
      {showExampleStore && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <ExampleStorePage onClose={() => setShowExampleStore(false)} />
          </Suspense>
        </div>
      )}

      {/* DSPy Optimizer Tool (overlays entire view) */}
      {showDSPyOptimizer && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <div className="flex flex-col h-full">
              <div className="bg-white dark:bg-gray-900 border-b border-db-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                  <h1 className="text-2xl font-bold text-db-gray-800 dark:text-white">
                    DSPy Optimizer
                  </h1>
                  <button
                    onClick={() => setShowDSPyOptimizer(false)}
                    className="px-4 py-2 text-sm text-db-gray-600 hover:text-db-gray-800 dark:text-gray-400 dark:hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-db-gray-600 dark:text-gray-400 mb-4">
                    DSPy Optimizer coming soon
                  </p>
                  <p className="text-sm text-db-gray-500 dark:text-gray-500">
                    This will launch DSPy optimization runs for your assemblies
                  </p>
                </div>
              </div>
            </div>
          </Suspense>
        </div>
      )}

      {/* Canonical Labeling Tool (overlays entire view) */}
      {showCanonicalLabeling && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <CanonicalLabelingTool
              onClose={() => setShowCanonicalLabeling(false)}
            />
          </Suspense>
        </div>
      )}

      {/* Data Quality Tool (overlays entire view) */}
      {showDataQuality && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <DataQualityPage
              onClose={() => setShowDataQuality(false)}
            />
          </Suspense>
        </div>
      )}
    </AppLayout>
  );
}

function AppWithSidebar() {
  return (
    <WorkflowProvider>
      <AppContent />
    </WorkflowProvider>
  );
}

export default AppWithSidebar;
