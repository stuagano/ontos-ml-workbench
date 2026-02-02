/**
 * Databits Workbench - APX Sidebar Layout Version
 *
 * Uses collapsible sidebar navigation instead of horizontal breadcrumb.
 * Toggle USE_SIDEBAR_LAYOUT in App.tsx to switch between layouts.
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { AppLayout } from "./components/apx";
import { TemplateEditor } from "./components/TemplateEditor";
import { SheetBuilder } from "./pages/SheetBuilder";
import { TemplateBuilderPage } from "./pages/TemplateBuilderPage";
import { CuratePage } from "./pages/CuratePage";
import { LabelingWorkflow } from "./components/labeling";
import { TrainPage } from "./pages/TrainPage";
import { DeployPage } from "./pages/DeployPage";
import { MonitorPage } from "./pages/MonitorPage";
import { ImprovePage } from "./pages/ImprovePage";
import { ExampleStorePage } from "./pages/ExampleStorePage";
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
  if (workflow.state.selectedTemplate) completedStages.push("template");

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
    if (showEditor) setShowEditor(false);
    if (showExampleStore) setShowExampleStore(false);
  }, [showEditor, showExampleStore]);

  // Register keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      modifiers: ["alt"],
      handler: handleNewTemplate,
      description: "New template",
    },
    {
      key: "e",
      modifiers: ["alt"],
      handler: () => setShowExampleStore(!showExampleStore),
      description: "Toggle Example Store",
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
            Loading Databits Workbench...
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
      case "template":
        return <TemplateBuilderPage />;
      case "curate":
        return <CuratePage />;
      case "label":
        return <LabelingWorkflow />;
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
      showExamples={showExampleStore}
      onToggleExamples={() => setShowExampleStore(!showExampleStore)}
    >
      <ErrorBoundary>{renderStage()}</ErrorBoundary>

      {/* Template Editor Modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => setShowEditor(false)}
          onSaved={() => {
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

      {/* Example Store Overlay */}
      {showExampleStore && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950">
          <ExampleStorePage onClose={() => setShowExampleStore(false)} />
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
