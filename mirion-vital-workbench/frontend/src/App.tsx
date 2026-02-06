/**
 * Databits Workbench - Main Application
 *
 * Complete AI lifecycle platform for Databricks:
 * DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE
 */

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Header } from "./components/Header";
import { PipelineBreadcrumb } from "./components/PipelineBreadcrumb";
import { StageSubNav, type StageMode } from "./components/StageSubNav";
import { TemplateEditor } from "./components/TemplateEditor";

// Lazy load pages - only load when needed
const SheetBuilder = lazy(() =>
  import("./pages/SheetBuilder").then((m) => ({ default: m.SheetBuilder })),
);
const TemplateBuilderPage = lazy(() =>
  import("./pages/TemplateBuilderPage").then((m) => ({
    default: m.TemplateBuilderPage,
  })),
);
const TemplatePage = lazy(() =>
  import("./pages/TemplatePage").then((m) => ({ default: m.TemplatePage })),
);
const CuratePage = lazy(() =>
  import("./pages/CuratePage").then((m) => ({ default: m.CuratePage })),
);
const LabelingWorkflow = lazy(() =>
  import("./components/labeling").then((m) => ({
    default: m.LabelingWorkflow,
  })),
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
const CanonicalLabelingTool = lazy(() =>
  import("./components/CanonicalLabelingTool").then((m) => ({
    default: m.CanonicalLabelingTool,
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
  const [showExampleStore, setShowExampleStore] = useState(false);
  const [showCanonicalLabeling, setShowCanonicalLabeling] = useState(false);
  const [stageMode, setStageMode] = useState<StageMode>("browse");
  const toast = useToast();
  const keyboardHelp = useKeyboardShortcutsHelp();
  const workflow = useWorkflow();

  // Map workflow stage to pipeline stage for breadcrumb
  const currentStage = workflow.state.currentStage as PipelineStage;
  const setCurrentStage = (stage: PipelineStage) => {
    workflow.setCurrentStage(stage as WorkflowStage);
    setStageMode("browse"); // Reset to browse mode when switching stages
  };

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

  // URL parameter support for direct navigation (dev mode)
  // Usage: ?stage=curate&sheetId=xxx or ?stage=template
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stageParam = params.get("stage") as WorkflowStage | null;
    const sheetIdParam = params.get("sheetId");
    const modeParam = params.get("mode") as StageMode | null;

    if (stageParam) {
      const validStages: WorkflowStage[] = [
        "data",
        "template",
        "curate",
        "label",
        "train",
        "deploy",
        "monitor",
        "improve",
      ];
      if (validStages.includes(stageParam)) {
        console.log(`[App] URL param: jumping to stage=${stageParam}`);
        workflow.setCurrentStage(stageParam);

        // If a sheet ID is provided, set it as the selected source
        if (sheetIdParam) {
          console.log(`[App] URL param: setting sheetId=${sheetIdParam}`);
          workflow.setSelectedSource({
            id: sheetIdParam,
            name: "URL-loaded sheet",
            type: "table",
            fullPath: sheetIdParam,
          } as any);
        }

        if (modeParam === "browse" || modeParam === "create") {
          setStageMode(modeParam);
        }

        // Clear URL params after applying
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []); // Run once on mount

  // Keyboard shortcut handlers
  const handleNewTemplate = useCallback(() => {
    setEditingTemplate(null);
    setShowEditor(true);
    toast.info("New Databit", "Creating new template (Alt+N)");
  }, [toast]);

  const handleEscape = useCallback(() => {
    if (showEditor) {
      setShowEditor(false);
    }
  }, [showEditor]);

  // Register keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      modifiers: ["alt"],
      handler: handleNewTemplate,
      description: "New template",
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
      <div className="min-h-screen flex items-center justify-center bg-db-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-db-orange mx-auto mb-4" />
          <p className="text-db-gray-600">Loading Databits Workbench...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-db-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-semibold text-db-gray-800 mb-2">
            Connection Error
          </h2>
          <p className="text-db-gray-600 mb-4">
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
    console.log(
      "[App] renderStage called with currentStage:",
      currentStage,
      "mode:",
      stageMode,
    );

    switch (currentStage) {
      case "data":
        // Data stage: browse UC tables vs create new sheet
        return <SheetBuilder mode={stageMode} onModeChange={setStageMode} />;

      case "template":
        // Template stage: browse library vs create new
        if (stageMode === "browse") {
          return (
            <TemplatePage
              onEditTemplate={(template) => {
                setEditingTemplate(template);
                if (template === null) {
                  setStageMode("create"); // Switch to create mode for new template
                } else {
                  setShowEditor(true);
                }
              }}
            />
          );
        }
        return <TemplateBuilderPage onCancel={() => setStageMode("browse")} />;

      case "curate":
        return <CuratePage mode={stageMode} />;

      case "label":
        return <LabelingWorkflow />;

      case "train":
        return <TrainPage mode={stageMode} onModeChange={setStageMode} />;

      case "deploy":
        return <DeployPage mode={stageMode} />;

      case "monitor":
        return <MonitorPage mode={stageMode} />;

      case "improve":
        return <ImprovePage mode={stageMode} onModeChange={setStageMode} />;

      default:
        return <SheetBuilder mode={stageMode} onModeChange={setStageMode} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-db-gray-50">
      <Header
        appName={config?.app_name || "Databits Workbench"}
        currentUser={config?.current_user || "Unknown"}
        workspaceUrl={config?.workspace_url || ""}
        showCanonicalLabeling={showCanonicalLabeling}
        onToggleCanonicalLabeling={() =>
          setShowCanonicalLabeling(!showCanonicalLabeling)
        }
        showExamples={showExampleStore}
        onToggleExamples={() => setShowExampleStore(!showExampleStore)}
      />

      <PipelineBreadcrumb
        currentStage={currentStage}
        onStageClick={setCurrentStage}
      />

      <StageSubNav
        stage={currentStage}
        mode={stageMode}
        onModeChange={setStageMode}
      />

      <main className="flex-1 flex flex-col">
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
      </main>

      {/* Template Editor Modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => setShowEditor(false)}
          onSaved={(saved) => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={keyboardHelp.isOpen}
        onClose={keyboardHelp.close}
      />

      {/* Canonical Labeling Tool Overlay */}
      {showCanonicalLabeling && (
        <div className="fixed inset-0 z-40 bg-db-gray-50">
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

      {/* Example Store Overlay */}
      {showExampleStore && (
        <div className="fixed inset-0 z-40 bg-db-gray-50">
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
    </div>
  );
}

// Wrap the app with WorkflowProvider
function App() {
  return (
    <WorkflowProvider>
      <AppContent />
    </WorkflowProvider>
  );
}

export default App;
