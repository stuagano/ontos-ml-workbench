/**
 * DEMO: How to integrate modules into your pages
 *
 * This shows complete integration examples for both modules we just built
 */

import { useState } from "react";
import { Wand2, Shield } from "lucide-react";
import { useModules } from "./hooks/useModules";
import { useWorkflow } from "./context/WorkflowContext";

// ============================================================================
// Example 1: Using DSPy in TRAIN stage
// ============================================================================

export function TrainPageWithDSPy() {
  const { state } = useWorkflow();
  const { openModule, activeModule, isOpen, closeModule } = useModules({ stage: "train" });

  // Prepare context for DSPy module
  const dspyContext = {
    stage: "train" as const,
    templateId: state.selectedTemplate?.id,
    template: state.selectedTemplate, // Pass full template object
    assemblyId: state.selectedAssembly?.id,
    mode: "pre-training",
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Train Model</h1>

      {/* DSPy Optimization Callout */}
      {state.selectedTemplate && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Wand2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-db-gray-900 mb-1">
                Optimize Before Training
              </h3>
              <p className="text-sm text-db-gray-600 mb-4">
                Use DSPy to automatically optimize your prompt template and select the best few-shot examples.
              </p>
              <button
                onClick={() => openModule("dspy-optimization", dspyContext)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Wand2 className="w-4 h-4" />
                Run Optimization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regular training config */}
      <div className="bg-white rounded-lg border border-db-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Training Configuration</h2>
        {/* Training form... */}
      </div>

      {/* Module Modal (rendered when module is open) */}
      {isOpen && activeModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-db-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeModule.icon && (
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <activeModule.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold">{activeModule.name}</h2>
                  <p className="text-sm text-db-gray-500">{activeModule.description}</p>
                </div>
              </div>
              <button
                onClick={() => closeModule()}
                className="p-2 hover:bg-db-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <activeModule.component
                context={dspyContext}
                onClose={closeModule}
                displayMode="modal"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 2: Using Data Quality Inspector in DATA stage
// ============================================================================

export function DataPageWithQuality() {
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  const { openModule, activeModule, isOpen, closeModule } = useModules({ stage: "data" });

  // Prepare context for Data Quality module
  const qualityContext = {
    stage: "data" as const,
    sheetId: selectedSheet?.id,
    sheetName: selectedSheet?.name,
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Select Data Source</h1>

      {/* Sheet selection */}
      <div className="bg-white rounded-lg border border-db-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Unity Catalog Sheets</h2>
        {/* Sheet list... */}
        <button
          onClick={() => setSelectedSheet({ id: "sheet_123", name: "defect_inspections" })}
          className="p-4 border border-db-gray-200 rounded-lg hover:border-indigo-300"
        >
          defect_inspections
        </button>
      </div>

      {/* Data Quality Callout */}
      {selectedSheet && (
        <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-db-gray-900 mb-1">
                Inspect Data Quality
              </h3>
              <p className="text-sm text-db-gray-600 mb-4">
                Run automated quality checks to catch issues before training. Checks schema,
                completeness, distribution, and more.
              </p>
              <button
                onClick={() => openModule("data-quality", qualityContext)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Shield className="w-4 h-4" />
                Run Quality Checks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module Modal */}
      {isOpen && activeModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <activeModule.component
              context={qualityContext}
              onClose={closeModule}
              displayMode="modal"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 3: Using DSPy in IMPROVE stage (feedback-driven)
// ============================================================================

export function ImprovePageWithDSPy() {
  const { state } = useWorkflow();
  const { openModule } = useModules({ stage: "improve" });
  const negativeFeedback = []; // Mock - would come from API

  const dspyContext = {
    stage: "improve" as const,
    templateId: state.selectedTemplate?.id,
    template: state.selectedTemplate,
    feedbackIds: negativeFeedback.map((f: any) => f.id),
    mode: "feedback-optimization",
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Improve Model</h1>

      {/* Feedback-driven optimization */}
      {negativeFeedback.length >= 10 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Wand2 className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-db-gray-900 mb-1">
                Optimization Opportunity
              </h3>
              <p className="text-sm text-db-gray-600 mb-4">
                You have {negativeFeedback.length} negative feedback items. DSPy can analyze
                these patterns and suggest optimizations.
              </p>
              <button
                onClick={() => openModule("dspy-optimization", dspyContext)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                <Wand2 className="w-4 h-4" />
                Optimize from Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regular feedback interface */}
      <div className="bg-white rounded-lg border border-db-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">User Feedback</h2>
        {/* Feedback list... */}
      </div>
    </div>
  );
}

// ============================================================================
// How to use in your actual pages
// ============================================================================

/**
 * Integration steps:
 *
 * 1. Import useModules hook:
 *    import { useModules } from "../hooks/useModules";
 *
 * 2. Initialize in your page component:
 *    const { openModule, activeModule, isOpen, closeModule } = useModules({ stage: "train" });
 *
 * 3. Create context for the module:
 *    const context = {
 *      stage: "train",
 *      template: selectedTemplate,
 *      mode: "pre-training"
 *    };
 *
 * 4. Add button to open module:
 *    <button onClick={() => openModule("dspy-optimization", context)}>
 *      Optimize Template
 *    </button>
 *
 * 5. Render module when open:
 *    {isOpen && activeModule && (
 *      <ModuleModal>
 *        <activeModule.component context={context} onClose={closeModule} />
 *      </ModuleModal>
 *    )}
 *
 * That's it! The module system handles:
 * - Checking if module can activate
 * - Loading the component
 * - Passing context
 * - Lifecycle hooks
 */
