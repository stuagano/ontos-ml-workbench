/**
 * TrainPage - TRAIN stage for fine-tuning models
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  ExternalLink,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Database,
  FileCode,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { clsx } from "clsx";
import { listTemplates, triggerJob, getCurationStats } from "../services/api";
import { openDatabricks } from "../services/databricksLinks";
import { TrainingRunsPanel } from "../components/TrainingRunsPanel";
import { useWorkflow } from "../context/WorkflowContext";

const AVAILABLE_MODELS = [
  {
    id: "databricks-meta-llama-3-1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
  },
  {
    id: "databricks-meta-llama-3-1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
  },
  { id: "databricks-dbrx-instruct", name: "DBRX Instruct" },
  { id: "databricks-mixtral-8x7b-instruct", name: "Mixtral 8x7B Instruct" },
];

// ============================================================================
// WorkflowBanner Component
// ============================================================================

function WorkflowBanner() {
  const { state, goToPreviousStage, goToNextStage } = useWorkflow();

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Data source */}
          {state.selectedSource && (
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-xs text-green-600 font-medium">
                  Data Source
                </div>
                <div className="text-sm text-green-800">
                  {state.selectedSource.name}
                </div>
              </div>
            </div>
          )}

          {/* Template */}
          {state.selectedTemplate && (
            <>
              <ChevronRight className="w-4 h-4 text-green-400" />
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-green-600" />
                <div>
                  <div className="text-xs text-green-600 font-medium">
                    Template
                  </div>
                  <div className="text-sm text-green-800">
                    {state.selectedTemplate.name}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousStage}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Curate
          </button>
          <button
            onClick={goToNextStage}
            className="flex items-center gap-1 px-4 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
          >
            Continue to Deploy
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TrainPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [epochs, setEpochs] = useState(3);
  const [learningRate, setLearningRate] = useState(0.0001);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: templatesData } = useQuery({
    queryKey: ["templates", "published"],
    queryFn: () => listTemplates({ status: "published" }),
  });

  const templates = templatesData?.templates || [];
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const trainMutation = useMutation({
    mutationFn: () =>
      triggerJob(
        "finetune_fmapi",
        {
          template_id: selectedTemplateId,
          base_model: selectedModel,
          epochs: String(epochs),
          learning_rate: String(learningRate),
        },
        { template_id: selectedTemplateId || undefined },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Training Started", "Fine-tuning job has been submitted");
    },
    onError: (error) => {
      toast.error(
        "Training Failed",
        error instanceof Error ? error.message : "Failed to start training",
      );
    },
  });

  const assemblyMutation = useMutation({
    mutationFn: () =>
      triggerJob(
        "data_assembly",
        { template_id: selectedTemplateId },
        { template_id: selectedTemplateId || undefined },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(
        "Assembly Started",
        "Dataset assembly job has been submitted",
      );
    },
    onError: (error) => {
      toast.error(
        "Assembly Failed",
        error instanceof Error
          ? error.message
          : "Failed to start data assembly",
      );
    },
  });

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Workflow Banner */}
        <WorkflowBanner />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-db-gray-900">Training</h1>
            <p className="text-db-gray-600 mt-1">
              Fine-tune models on your curated training data
            </p>
          </div>
          <button
            onClick={() => openDatabricks.mlflowExperiments()}
            className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
          >
            <ExternalLink className="w-4 h-4" />
            Open MLflow
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template selection */}
            <div className="bg-white rounded-lg border border-db-gray-200 p-4">
              <h2 className="font-semibold text-db-gray-800 mb-4">
                1. Select Databit
              </h2>
              <select
                value={selectedTemplateId || ""}
                onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (v{t.version})
                  </option>
                ))}
              </select>

              {selectedTemplate && (
                <div className="mt-4 p-3 bg-db-gray-50 rounded-lg text-sm">
                  <div className="font-medium">{selectedTemplate.name}</div>
                  <div className="text-db-gray-500 mt-1">
                    {selectedTemplate.description}
                  </div>
                </div>
              )}
            </div>

            {/* Data assembly */}
            <div className="bg-white rounded-lg border border-db-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-db-gray-800">
                  2. Prepare Training Data
                </h2>
                <button
                  onClick={() => assemblyMutation.mutate()}
                  disabled={!selectedTemplateId || assemblyMutation.isPending}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm",
                    !selectedTemplateId
                      ? "bg-db-gray-100 text-db-gray-400 cursor-not-allowed"
                      : "bg-green-50 text-green-700 hover:bg-green-100",
                  )}
                >
                  {assemblyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Assemble Dataset
                </button>
              </div>
              <p className="text-sm text-db-gray-500">
                Compile all approved curation items into a training dataset
                format.
              </p>
            </div>

            {/* Training config */}
            <div className="bg-white rounded-lg border border-db-gray-200 p-4">
              <h2 className="font-semibold text-db-gray-800 mb-4">
                3. Configure Training
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-db-gray-700 mb-1 block">
                    Base Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {AVAILABLE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-db-gray-700 mb-1 block">
                      Epochs
                    </label>
                    <input
                      type="number"
                      value={epochs}
                      onChange={(e) => setEpochs(Number(e.target.value))}
                      min={1}
                      max={10}
                      className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-db-gray-700 mb-1 block">
                      Learning Rate
                    </label>
                    <input
                      type="number"
                      value={learningRate}
                      onChange={(e) => setLearningRate(Number(e.target.value))}
                      step={0.00001}
                      className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Launch training */}
            <div className="bg-white rounded-lg border border-db-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-db-gray-800">
                    4. Launch Training
                  </h2>
                  <p className="text-sm text-db-gray-500 mt-1">
                    Start fine-tuning with Foundation Model APIs
                  </p>
                </div>
                <button
                  onClick={() => trainMutation.mutate()}
                  disabled={!selectedTemplateId || trainMutation.isPending}
                  className={clsx(
                    "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors",
                    !selectedTemplateId
                      ? "bg-db-gray-100 text-db-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700",
                  )}
                >
                  {trainMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  Start Training
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <TrainingRunsPanel templateId={selectedTemplateId || undefined} />

            {/* Quick stats */}
            {selectedTemplate && (
              <DatasetStats templateId={selectedTemplateId!} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component to show dataset stats for training readiness
function DatasetStats({ templateId }: { templateId: string }) {
  const { data: stats } = useQuery({
    queryKey: ["curationStats", templateId],
    queryFn: () => getCurationStats(templateId),
  });

  if (!stats) return null;

  const totalApproved = stats.approved + stats.auto_approved;
  const readyForTraining = totalApproved >= 10;

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <h3 className="font-semibold text-db-gray-800 mb-3">Training Data</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-db-gray-500">Total Items</span>
          <span className="font-medium">{stats.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-db-gray-500">Approved</span>
          <span className="font-medium text-green-600">{totalApproved}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-db-gray-500">Pending Review</span>
          <span className="font-medium text-amber-600">
            {stats.pending + stats.needs_review}
          </span>
        </div>
        {stats.avg_quality_score && (
          <div className="flex justify-between">
            <span className="text-db-gray-500">Avg Quality</span>
            <span className="font-medium">
              {stats.avg_quality_score.toFixed(1)}/5
            </span>
          </div>
        )}
      </div>

      <div
        className={clsx(
          "mt-4 px-3 py-2 rounded-lg text-sm",
          readyForTraining
            ? "bg-green-50 text-green-700"
            : "bg-amber-50 text-amber-700",
        )}
      >
        {readyForTraining ? (
          <>Ready for training ({totalApproved} samples)</>
        ) : (
          <>Need {10 - totalApproved} more approved items</>
        )}
      </div>
    </div>
  );
}
