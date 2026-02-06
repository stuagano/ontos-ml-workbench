/**
 * EXAMPLE: How to integrate modules into a stage page
 *
 * This shows how TrainPage would integrate the DSPy module
 */

import { useState } from "react";
import { Wand2, Play, Settings } from "lucide-react";
import { useModules } from "../hooks/useModules";
import { useWorkflow } from "../context/WorkflowContext";
import { ModuleDrawer, ModuleQuickAction } from "../components/ModuleDrawer";
import { dspyModule } from "../modules/registry";

export function TrainPageWithModules() {
  const { state } = useWorkflow();
  const { availableModules, openModule, activeModule, isOpen, closeModule } =
    useModules({ stage: "train" });

  // Create context for modules
  const moduleContext = {
    stage: "train" as const,
    templateId: state.selectedTemplate?.id,
    assemblyId: state.selectedAssembly?.id,
  };

  return (
    <div className="flex-1 flex flex-col bg-db-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-db-gray-900">Train Model</h1>
          <p className="text-db-gray-600 mt-1">
            Configure and run fine-tuning jobs
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Optimization callout - DSPy module integration */}
          {state.selectedTemplate && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Wand2 className="w-6 h-6 text-indigo-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-db-gray-900 mb-1">
                    Optimize Before Training
                  </h3>
                  <p className="text-sm text-db-gray-600 mb-4">
                    Use DSPy to automatically optimize your prompt template and
                    select the best few-shot examples before fine-tuning. This
                    can significantly improve model quality.
                  </p>

                  {/* Quick action button for DSPy module */}
                  <ModuleQuickAction
                    module={dspyModule}
                    context={{
                      ...moduleContext,
                      mode: "pre-training",
                    }}
                    onOpen={() =>
                      openModule("dspy-optimization", {
                        ...moduleContext,
                        mode: "pre-training",
                      })
                    }
                    variant="primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Regular training configuration */}
          <div className="bg-white rounded-lg border border-db-gray-200 p-6">
            <h2 className="text-lg font-semibold text-db-gray-900 mb-4">
              Training Configuration
            </h2>

            {/* Training form fields... */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-db-gray-700 mb-1">
                  Base Model
                </label>
                <select className="w-full px-3 py-2 border border-db-gray-300 rounded-lg">
                  <option>claude-3-5-sonnet-20241022</option>
                  <option>claude-3-opus-20240229</option>
                  <option>claude-3-haiku-20240307</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-db-gray-700 mb-1">
                  Training Examples
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-db-gray-300 rounded-lg"
                  placeholder="1000"
                />
              </div>

              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Play className="w-4 h-4" />
                Start Training
              </button>
            </div>
          </div>

          {/* Training runs panel */}
          <div className="bg-white rounded-lg border border-db-gray-200 p-6">
            <h2 className="text-lg font-semibold text-db-gray-900 mb-4">
              Recent Training Runs
            </h2>
            <p className="text-sm text-db-gray-500">
              No training runs yet. Start a training job to see results here.
            </p>
          </div>
        </div>
      </div>

      {/* Module drawer - shows all available modules */}
      <ModuleDrawer
        modules={availableModules}
        context={moduleContext}
        onOpenModule={(moduleId, ctx) => openModule(moduleId, ctx)}
      />

      {/* Module modal - renders active module */}
      {isOpen && activeModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Module header */}
            <div className="px-6 py-4 border-b border-db-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeModule.icon && (
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <activeModule.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-db-gray-900">
                    {activeModule.name}
                  </h2>
                  <p className="text-sm text-db-gray-500">
                    {activeModule.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => closeModule()}
                className="p-2 hover:bg-db-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Module content */}
            <div className="flex-1 overflow-auto">
              <activeModule.component
                context={moduleContext}
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
// EXAMPLE: How IMPROVE stage integrates DSPy differently
// ============================================================================

export function ImprovePageWithModules() {
  const { state } = useWorkflow();
  const { openModule } = useModules({ stage: "improve" });
  const negativeFeedback = []; // useFeedback({ rating: "negative" })

  const moduleContext = {
    stage: "improve" as const,
    templateId: state.selectedTemplate?.id,
    feedbackIds: negativeFeedback.map((f: any) => f.id),
  };

  return (
    <div className="space-y-6">
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
                You have {negativeFeedback.length} negative feedback items.
                DSPy can analyze these patterns and optimize your template
                automatically.
              </p>

              <button
                onClick={() =>
                  openModule("dspy-optimization", {
                    ...moduleContext,
                    mode: "feedback-optimization",
                  })
                }
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
        <h2 className="text-lg font-semibold text-db-gray-900 mb-4">
          User Feedback
        </h2>
        {/* Feedback list... */}
      </div>
    </div>
  );
}
