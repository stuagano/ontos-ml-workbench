/**
 * Ontos ML Workbench - Main Application
 *
 * Complete AI lifecycle platform for Databricks:
 * DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE
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
} from "./context/WorkflowContext";
import type { PipelineStage, Template } from "./types";

function AppContent() {
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showExampleStore, setShowExampleStore] = useState(false);
  const [showCanonicalLabeling, setShowCanonicalLabeling] = useState(false);
  const [stageMode, setStageMode] = useState<StageMode>("browse");
  const [datasetContext, setDatasetContext] = useState<{
    columns: Array<{ name: string; type: string }>;
    sheetName?: string;
  } | null>(null);
  const toast = useToast();
  const keyboardHelp = useKeyboardShortcutsHelp();
  const workflow = useWorkflow();

  // Workflow stage is now PipelineStage (aligned types)
  const currentStage = workflow.state.currentStage;
  const setCurrentStage = (stage: PipelineStage) => {
    workflow.setCurrentStage(stage);
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
  // Usage: ?stage=label&sheetId=xxx or ?stage=data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stageParam = params.get("stage") as PipelineStage | null;
    const sheetIdParam = params.get("sheetId");
    const modeParam = params.get("mode") as StageMode | null;

    if (stageParam) {
      const validStages: PipelineStage[] = [
        "data",
        "label",
        "train",
        "deploy",
        "monitor",
        "improve",
      ];
      if (validStages.includes(stageParam)) {
        workflow.setCurrentStage(stageParam);

        // If a sheet ID is provided, set it as the selected source
        if (sheetIdParam) {
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

  // Listen for custom event to create template with dataset context
  useEffect(() => {
    const handleCreateTemplateWithContext = (event: CustomEvent) => {
      const { columns, sheetName } = event.detail;
      setDatasetContext({ columns, sheetName });
      setEditingTemplate(null);
      setShowEditor(true);
      toast.info("New Template", `Creating template for ${sheetName || "dataset"}`);
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
          <p className="text-db-gray-600">Loading Ontos ML Workbench...</p>
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
    switch (currentStage) {
      case "data":
        // DATA stage: Select dataset, preview data, configure template, generate training data
        return <SheetBuilder mode={stageMode} onModeChange={setStageMode} />;

      case "label":
        // Label stage: review and approve Q&A pairs (TEMP: using old curate page)
        return <CuratePage mode={stageMode} />;

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
        appName={config?.app_name || "Ontos ML Workbench"}
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
          datasetContext={datasetContext}
          onClose={() => {
            setShowEditor(false);
            setDatasetContext(null);
          }}
          onSaved={(saved) => {
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
