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
const CanonicalLabelModal = lazy(() =>
  import("./components/CanonicalLabelModal").then((m) => ({
    default: m.CanonicalLabelModal,
  })),
);
const DataQualityPage = lazy(() =>
  import("./pages/DataQualityPage").then((m) => ({
    default: m.DataQualityPage,
  })),
);
const DSPyOptimizationPage = lazy(() =>
  import("./pages/DSPyOptimizationPage").then((m) => ({
    default: m.DSPyOptimizationPage,
  })),
);
const LabelingWorkflow = lazy(() =>
  import("./components/labeling").then((m) => ({
    default: m.LabelingWorkflow,
  })),
);
const LabelSetsPage = lazy(() =>
  import("./pages/LabelSetsPage").then((m) => ({
    default: m.LabelSetsPage,
  })),
);
const RegistriesPage = lazy(() =>
  import("./pages/RegistriesPage").then((m) => ({
    default: m.RegistriesPage,
  })),
);
const GovernancePage = lazy(() =>
  import("./pages/GovernancePage").then((m) => ({
    default: m.GovernancePage,
  })),
);
import type { TabId as GovernanceTabId } from "./pages/GovernancePage";
const MarketplacePage = lazy(() =>
  import("./pages/MarketplacePage").then((m) => ({
    default: m.MarketplacePage,
  })),
);
import { ModuleDrawer } from "./components/ModuleDrawer";
import { useModules } from "./hooks/useModules";
import { getConfig, listTemplates } from "./services/api";
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
  const [showLabelingJobs, setShowLabelingJobs] = useState(false);
  const [showLabelSets, setShowLabelSets] = useState(false);
  const [showRegistries, setShowRegistries] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showGovernance, setShowGovernance] = useState(false);
  const [governanceTab, setGovernanceTab] = useState<GovernanceTabId | undefined>(undefined);
  const [selectedDSPyTemplate, setSelectedDSPyTemplate] = useState<Template | null>(null);
  const [datasetContext, setDatasetContext] = useState<{
    columns: Array<{ name: string; type: string }>;
    sheetName?: string;
  } | null>(null);
  const toast = useToast();
  const keyboardHelp = useKeyboardShortcutsHelp();
  const workflow = useWorkflow();

  // Map workflow stage to pipeline stage
  const currentStage = workflow.state.currentStage as PipelineStage;

  // Module drawer for current stage
  const {
    availableModules,
    openModule,
    activeModule,
    isOpen: isModuleOpen,
    closeModule,
  } = useModules({ stage: currentStage });
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

  // Fetch templates for DSPy optimizer template picker
  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => listTemplates(),
    enabled: showDSPyOptimizer && !selectedDSPyTemplate,
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
    if (showDSPyOptimizer) { setShowDSPyOptimizer(false); setSelectedDSPyTemplate(null); }
    if (showCanonicalLabeling) setShowCanonicalLabeling(false);
    if (showDataQuality) setShowDataQuality(false);
    if (showLabelingJobs) setShowLabelingJobs(false);
    if (showLabelSets) setShowLabelSets(false);
    if (showRegistries) setShowRegistries(false);
    if (showMarketplace) setShowMarketplace(false);
    if (showGovernance) setShowGovernance(false);
  }, [showEditor, showPromptTemplates, showExampleStore, showDSPyOptimizer, showCanonicalLabeling, showDataQuality, showLabelingJobs, showLabelSets, showRegistries, showMarketplace, showGovernance]);

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
      key: "j",
      modifiers: ["alt"],
      handler: () => setShowLabelingJobs(!showLabelingJobs),
      description: "Toggle Labeling Jobs",
    },
    {
      key: "s",
      modifiers: ["alt"],
      handler: () => setShowLabelSets(!showLabelSets),
      description: "Toggle Label Sets",
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
        return <CuratedDatasetsPage />;
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
      onGovernanceTabOpen={(tabId: string) => {
        setGovernanceTab(tabId as GovernanceTabId);
        setShowGovernance(true);
      }}
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
      showLabelingJobs={showLabelingJobs}
      onToggleLabelingJobs={() => setShowLabelingJobs(!showLabelingJobs)}
      showLabelSets={showLabelSets}
      onToggleLabelSets={() => setShowLabelSets(!showLabelSets)}
      showRegistries={showRegistries}
      onToggleRegistries={() => setShowRegistries(!showRegistries)}
      showMarketplace={showMarketplace}
      onToggleMarketplace={() => setShowMarketplace(!showMarketplace)}
      showGovernance={showGovernance}
      onToggleGovernance={() => setShowGovernance(!showGovernance)}
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

      {/* Module Drawer - floating icon buttons for current stage modules */}
      <ModuleDrawer
        modules={availableModules}
        context={{ stage: currentStage }}
        onOpenModule={openModule}
        position="right"
      />

      {/* Module Modal */}
      {isModuleOpen && activeModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-db-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeModule.icon && (
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                    <activeModule.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold dark:text-white">{activeModule.name}</h2>
                  <p className="text-sm text-db-gray-500 dark:text-gray-400">{activeModule.description}</p>
                </div>
              </div>
              <button
                onClick={() => closeModule()}
                className="p-2 hover:bg-db-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <span className="text-db-gray-600 dark:text-gray-400">✕</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <activeModule.component
                context={{ stage: currentStage }}
                onClose={closeModule}
                displayMode="modal"
              />
            </div>
          </div>
        </div>
      )}

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
            {selectedDSPyTemplate ? (
              <DSPyOptimizationPage
                template={selectedDSPyTemplate}
                onClose={() => {
                  setSelectedDSPyTemplate(null);
                  setShowDSPyOptimizer(false);
                }}
              />
            ) : (
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
                <div className="flex-1 p-8 max-w-3xl mx-auto w-full">
                  <p className="text-db-gray-600 dark:text-gray-400 mb-6">
                    Select a template to optimize with DSPy:
                  </p>
                  {templatesData?.templates?.length ? (
                    <div className="grid gap-3">
                      {templatesData.templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedDSPyTemplate(t)}
                          className="text-left p-4 rounded-lg border border-db-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/20 transition-colors"
                        >
                          <div className="font-medium text-db-gray-800 dark:text-white">
                            {t.name}
                          </div>
                          {t.description && (
                            <div className="text-sm text-db-gray-500 dark:text-gray-400 mt-1">
                              {t.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-db-gray-500 dark:text-gray-500">
                      No templates found. Create a template first in Prompt Templates (Alt+T).
                    </p>
                  )}
                </div>
              </div>
            )}
          </Suspense>
        </div>
      )}

      {/* Canonical Labeling Tool Modal */}
      <Suspense fallback={null}>
        <CanonicalLabelModal
          isOpen={showCanonicalLabeling}
          onClose={() => setShowCanonicalLabeling(false)}
        />
      </Suspense>

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

      {/* Labeling Jobs Tool (overlays entire view) */}
      {showLabelingJobs && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950 overflow-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <div className="bg-white dark:bg-gray-900 border-b border-db-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-db-gray-800 dark:text-white">
                  Labeling Jobs
                </h1>
                <button
                  onClick={() => setShowLabelingJobs(false)}
                  className="px-4 py-2 text-sm text-db-gray-600 hover:text-db-gray-800 dark:text-gray-400 dark:hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <LabelingWorkflow />
          </Suspense>
        </div>
      )}

      {/* Label Sets Tool (overlays entire view) */}
      {showLabelSets && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950 overflow-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <div className="bg-white dark:bg-gray-900 border-b border-db-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-db-gray-800 dark:text-white">
                  Label Sets
                </h1>
                <button
                  onClick={() => setShowLabelSets(false)}
                  className="px-4 py-2 text-sm text-db-gray-600 hover:text-db-gray-800 dark:text-gray-400 dark:hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <LabelSetsPage />
          </Suspense>
        </div>
      )}

      {/* Registries Tool (overlays entire view) */}
      {showRegistries && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950 overflow-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <RegistriesPage
              onClose={() => setShowRegistries(false)}
            />
          </Suspense>
        </div>
      )}

      {/* Marketplace (overlays entire view) */}
      {showMarketplace && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950 overflow-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <MarketplacePage
              onClose={() => setShowMarketplace(false)}
            />
          </Suspense>
        </div>
      )}

      {/* Governance (overlays entire view) */}
      {showGovernance && (
        <div className="fixed inset-0 z-50 bg-db-gray-50 dark:bg-gray-950 overflow-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-db-orange" />
              </div>
            }
          >
            <GovernancePage
              onClose={() => setShowGovernance(false)}
              initialTab={governanceTab}
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
