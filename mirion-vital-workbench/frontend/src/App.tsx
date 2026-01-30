/**
 * Databits Workbench - Main Application
 *
 * Complete AI lifecycle platform for Databricks:
 * DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Header } from "./components/Header";
import { PipelineBreadcrumb } from "./components/PipelineBreadcrumb";
import { TemplateEditor } from "./components/TemplateEditor";
import { SheetBuilder } from "./pages/SheetBuilder";
import { TemplateBuilderPage } from "./pages/TemplateBuilderPage";
import { CuratePage } from "./pages/CuratePage";
import { LabelingWorkflow } from "./components/labeling";
import { TrainPage } from "./pages/TrainPage";
import { DeployPage } from "./pages/DeployPage";
import { MonitorPage } from "./pages/MonitorPage";
import { ImprovePage } from "./pages/ImprovePage";

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
  const toast = useToast();
  const keyboardHelp = useKeyboardShortcutsHelp();
  const workflow = useWorkflow();

  // Map workflow stage to pipeline stage for breadcrumb
  const currentStage = workflow.state.currentStage as PipelineStage;
  const setCurrentStage = (stage: PipelineStage) => {
    workflow.setCurrentStage(stage as WorkflowStage);
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
    console.log("[App] renderStage called with currentStage:", currentStage);
    console.log("[App] workflow.state:", workflow.state);

    let component;
    switch (currentStage) {
      case "data":
        // AI Sheets - select base table and import columns
        component = <SheetBuilder />;
        console.log("[App] Rendering SheetBuilder for 'data' stage");
        break;
      case "template":
        // Build prompt templates from selected data columns
        component = <TemplateBuilderPage />;
        console.log("[App] Rendering TemplateBuilderPage for 'template' stage");
        break;
      case "curate":
        component = <CuratePage />;
        break;
      case "label":
        // Roboflow-inspired labeling workflow
        component = <LabelingWorkflow />;
        break;
      case "train":
        component = <TrainPage />;
        break;
      case "deploy":
        component = <DeployPage />;
        break;
      case "monitor":
        component = <MonitorPage />;
        break;
      case "improve":
        component = <ImprovePage />;
        break;
      default:
        console.log(
          "[App] Default case - rendering SheetBuilder for stage:",
          currentStage,
        );
        component = <SheetBuilder />;
    }
    return component;
  };

  return (
    <div className="min-h-screen flex flex-col bg-db-gray-50">
      <Header
        appName={config?.app_name || "Databits Workbench"}
        currentUser={config?.current_user || "Unknown"}
        workspaceUrl={config?.workspace_url || ""}
      />

      <PipelineBreadcrumb
        currentStage={currentStage}
        onStageClick={setCurrentStage}
      />

      <main className="flex-1 flex flex-col">
        <ErrorBoundary>{renderStage()}</ErrorBoundary>
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
