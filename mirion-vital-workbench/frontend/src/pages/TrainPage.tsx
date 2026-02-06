/**
 * TrainPage - TRAIN stage for fine-tuning models on assembled datasets
 *
 * Browse mode: List all assemblies (curated collections of prompt/response pairs)
 * Create mode: Configure training job with train/val split and foundation model
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  ExternalLink,
  Loader2,
  Database,
  Layers,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings2,
  Sparkles,
  Split,
  RefreshCw,
  Filter,
  Search,
  Wand2,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { clsx } from "clsx";
import {
  listAssemblies,
  triggerJob,
  exportAssembly,
} from "../services/api";
import { openDatabricks } from "../services/databricksLinks";
import { TrainingRunsPanel } from "../components/TrainingRunsPanel";
import { DataTable, Column, RowAction } from "../components/DataTable";
import { useModules } from "../hooks/useModules";
import type { AssembledDataset, AssemblyStatus } from "../types";

const AVAILABLE_MODELS = [
  {
    id: "databricks-meta-llama-3-1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    description: "Best quality, higher cost",
  },
  {
    id: "databricks-meta-llama-3-1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    description: "Good balance of quality and speed",
  },
  {
    id: "databricks-dbrx-instruct",
    name: "DBRX Instruct",
    description: "Databricks native model",
  },
  {
    id: "databricks-mixtral-8x7b-instruct",
    name: "Mixtral 8x7B Instruct",
    description: "Strong reasoning capabilities",
  },
];

// ============================================================================
// Assembly Card Component - Removed (using DataTable now)
// ============================================================================

// ============================================================================
// Training Configuration Panel
// ============================================================================

interface TrainingConfigProps {
  assembly: AssembledDataset;
  onStartTraining: (config: TrainingConfig) => void;
  isTraining: boolean;
}

interface TrainingConfig {
  assemblyId: string;
  baseModel: string;
  trainSplit: number;
  epochs: number;
  learningRate: number;
}

function TrainingConfigPanel({ assembly, onStartTraining, isTraining }: TrainingConfigProps) {
  const [baseModel, setBaseModel] = useState(AVAILABLE_MODELS[1].id);
  const [trainSplit, setTrainSplit] = useState(80);
  const [epochs, setEpochs] = useState(3);
  const [learningRate, setLearningRate] = useState(0.0001);

  const labeledCount = assembly.human_labeled_count + assembly.human_verified_count;
  const totalUsable = assembly.ai_generated_count + labeledCount;
  const trainCount = Math.floor(totalUsable * trainSplit / 100);
  const valCount = totalUsable - trainCount;

  const canTrain = assembly.status === "ready" && totalUsable >= 10;

  return (
    <div className="space-y-6">
      {/* Assembly Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-green-600" />
          <h3 className="font-medium text-green-800">
            {assembly.sheet_name || `Assembly ${assembly.id.slice(0, 8)}`}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-green-600">Total Rows</span>
            <p className="font-semibold text-green-800">{assembly.total_rows}</p>
          </div>
          <div>
            <span className="text-green-600">Usable for Training</span>
            <p className="font-semibold text-green-800">{totalUsable}</p>
          </div>
          <div>
            <span className="text-green-600">Human Verified</span>
            <p className="font-semibold text-green-800">{assembly.human_verified_count}</p>
          </div>
        </div>
      </div>

      {/* Train/Val Split */}
      <div className="bg-white border border-db-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Split className="w-5 h-5 text-db-gray-500" />
          <h3 className="font-medium text-db-gray-800">Train / Validation Split</h3>
        </div>

        <div className="space-y-3">
          <input
            type="range"
            min={60}
            max={95}
            value={trainSplit}
            onChange={(e) => setTrainSplit(Number(e.target.value))}
            className="w-full accent-green-600"
          />

          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Training: <strong>{trainCount}</strong> ({trainSplit}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Validation: <strong>{valCount}</strong> ({100 - trainSplit}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Foundation Model Selection */}
      <div className="bg-white border border-db-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-db-gray-500" />
          <h3 className="font-medium text-db-gray-800">Foundation Model</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => setBaseModel(model.id)}
              className={clsx(
                "p-3 rounded-lg border text-left transition-all",
                baseModel === model.id
                  ? "border-green-500 bg-green-50"
                  : "border-db-gray-200 hover:border-green-300"
              )}
            >
              <div className="font-medium text-sm">{model.name}</div>
              <div className="text-xs text-db-gray-500 mt-1">{model.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white border border-db-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-db-gray-500" />
          <h3 className="font-medium text-db-gray-800">Training Parameters</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-db-gray-600 mb-1 block">Epochs</label>
            <input
              type="number"
              value={epochs}
              onChange={(e) => setEpochs(Number(e.target.value))}
              min={1}
              max={10}
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="text-sm text-db-gray-600 mb-1 block">Learning Rate</label>
            <input
              type="number"
              value={learningRate}
              onChange={(e) => setLearningRate(Number(e.target.value))}
              step={0.00001}
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Start Training Button */}
      <button
        onClick={() => onStartTraining({
          assemblyId: assembly.id,
          baseModel,
          trainSplit,
          epochs,
          learningRate,
        })}
        disabled={!canTrain || isTraining}
        className={clsx(
          "w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition-all",
          canTrain && !isTraining
            ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl"
            : "bg-db-gray-200 text-db-gray-500 cursor-not-allowed"
        )}
      >
        {isTraining ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Starting Training...
          </>
        ) : (
          <>
            <Play className="w-6 h-6" />
            Start Fine-tuning
          </>
        )}
      </button>

      {!canTrain && (
        <p className="text-center text-sm text-amber-600">
          {assembly.status !== "ready"
            ? "Assembly is not ready yet"
            : `Need at least 10 labeled rows (have ${totalUsable})`}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Training Browser Modal - Removed (using full-page table view now)
// ============================================================================

// ============================================================================
// Main TrainPage Component
// ============================================================================

interface TrainPageProps {
  mode?: "browse" | "create";
  onModeChange?: (mode: "browse" | "create") => void;
}

export function TrainPage({ mode = "browse", onModeChange }: TrainPageProps) {
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssemblyStatus | "">("");
  const queryClient = useQueryClient();
  const toast = useToast();
  const { openModule, activeModule, isOpen: isModuleOpen, closeModule } = useModules({ stage: "train" });

  // Fetch all assemblies
  const { data: assemblies, isLoading } = useQuery({
    queryKey: ["assemblies"],
    queryFn: () => listAssemblies(),
  });

  const filteredAssemblies = (assemblies || []).filter((assembly) => {
    const matchesSearch = (assembly.sheet_name || assembly.id).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || assembly.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedAssembly = assemblies?.find((a) => a.id === selectedAssemblyId);

  // Training mutation: Export first, then trigger training
  const trainMutation = useMutation({
    mutationFn: async (config: TrainingConfig) => {
      // Step 1: Export assembly with train/val split
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const volumePath = `/Volumes/erp-demonstrations/vital_workbench/training_data/${config.assemblyId.slice(0, 8)}_${timestamp}.jsonl`;

      toast.info("Exporting Data", "Preparing training data...");

      const exportResult = await exportAssembly(config.assemblyId, {
        format: "openai_chat",
        volume_path: volumePath,
        include_system_instruction: true,
        train_split: config.trainSplit / 100, // Convert percentage to fraction
        random_seed: 42,
      });

      if (!exportResult.train_path) {
        throw new Error("Export failed: no training data path returned");
      }

      // Step 2: Trigger the training job with exported paths
      return triggerJob("finetune_fmapi", {
        assembly_id: config.assemblyId,
        base_model: config.baseModel,
        train_path: exportResult.train_path,
        val_path: exportResult.val_path || "",
        epochs: String(config.epochs),
        learning_rate: String(config.learningRate),
        output_model_name: `vital-${config.assemblyId.slice(0, 8)}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Training Started", "Fine-tuning job has been submitted");
      if (onModeChange) onModeChange("browse");
    },
    onError: (error) => {
      toast.error(
        "Training Failed",
        error instanceof Error ? error.message : "Failed to start training"
      );
    },
  });

  const handleSelectAssembly = (assembly: AssembledDataset) => {
    setSelectedAssemblyId(assembly.id);
    if (onModeChange) onModeChange("create");
  };

  const statusConfig: Record<AssemblyStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
    ready: { icon: CheckCircle, color: "text-green-700 bg-green-50", label: "Ready" },
    assembling: { icon: Clock, color: "text-amber-700 bg-amber-50", label: "Assembling" },
    failed: { icon: AlertCircle, color: "text-red-700 bg-red-50", label: "Failed" },
    archived: { icon: Database, color: "text-gray-700 bg-gray-50", label: "Archived" },
  };

  // Browse mode: List all assemblies
  if (mode === "browse") {
    // Define table columns
    const columns: Column<AssembledDataset>[] = [
      {
        key: "name",
        header: "Dataset Name",
        width: "30%",
        render: (assembly) => (
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-db-gray-900">
                {assembly.sheet_name || `Assembly ${assembly.id.slice(0, 8)}`}
              </div>
              <div className="text-sm text-db-gray-500 truncate">
                {assembly.template_config?.name || "Custom template"}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "15%",
        render: (assembly) => {
          const status = statusConfig[assembly.status] || statusConfig.ready;
          const StatusIcon = status.icon;
          return (
            <span className={clsx("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit", status.color)}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          );
        },
      },
      {
        key: "data",
        header: "Data Counts",
        width: "25%",
        render: (assembly) => {
          const labeledCount = assembly.human_labeled_count + assembly.human_verified_count;
          const totalUsable = assembly.ai_generated_count + labeledCount;
          return (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-db-gray-600">
                <strong>{assembly.total_rows}</strong> total
              </span>
              <span className="text-green-600">
                <strong>{totalUsable}</strong> labeled
              </span>
              {assembly.flagged_count ? (
                <span className="text-amber-600">
                  <strong>{assembly.flagged_count}</strong> flagged
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "readiness",
        header: "Training Ready",
        width: "15%",
        render: (assembly) => {
          const labeledCount = assembly.human_labeled_count + assembly.human_verified_count;
          const totalUsable = assembly.ai_generated_count + labeledCount;
          const readyForTraining = assembly.status === "ready" && totalUsable >= 10;
          return readyForTraining ? (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              ✓ Ready
            </span>
          ) : (
            <span className="text-xs text-db-gray-400">Not ready</span>
          );
        },
      },
      {
        key: "updated",
        header: "Last Updated",
        width: "15%",
        render: (assembly) => (
          <span className="text-sm text-db-gray-500">
            {assembly.updated_at
              ? new Date(assembly.updated_at).toLocaleDateString()
              : "N/A"}
          </span>
        ),
      },
    ];

    // Define row actions
    const rowActions: RowAction<AssembledDataset>[] = [
      {
        label: "Configure Training",
        icon: Sparkles,
        onClick: handleSelectAssembly,
        className: "text-green-600",
      },
      {
        label: "View in Databricks",
        icon: ExternalLink,
        onClick: (assembly) => {
          window.open(`${window.location.origin}/databricks/assemblies/${assembly.id}`, '_blank');
        },
      },
    ];

    const emptyState = (
      <div className="text-center py-20 bg-white rounded-lg">
        <Layers className="w-16 h-16 text-db-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-db-gray-700 mb-2">
          No assemblies found
        </h3>
        <p className="text-db-gray-500 mb-6">
          {search || statusFilter
            ? "Try adjusting your filters"
            : "Create an assembly in the Curate stage by applying a template to your data"}
        </p>
      </div>
    );

    return (
      <div className="flex-1 flex flex-col bg-db-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-db-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-db-gray-900">Training Datasets</h1>
                <p className="text-db-gray-600 mt-1">
                  Select an assembled dataset to train a fine-tuned model
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["assemblies"] })}
                  className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:text-db-gray-800 hover:bg-db-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={() => openDatabricks.mlflowExperiments()}
                  className="flex items-center gap-2 px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open MLflow
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
              <Filter className="w-4 h-4 text-db-gray-400" />
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
                <input
                  type="text"
                  placeholder="Filter datasets by name or template..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AssemblyStatus | "")}
                className="px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="">All Status</option>
                <option value="ready">Ready</option>
                <option value="assembling">Assembling</option>
                <option value="failed">Failed</option>
                <option value="archived">Archived</option>
              </select>
              {(search || statusFilter) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                  }}
                  className="text-sm text-db-gray-500 hover:text-db-gray-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 px-6 pb-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : (
              <DataTable
                data={filteredAssemblies}
                columns={columns}
                rowKey={(assembly) => assembly.id}
                onRowClick={handleSelectAssembly}
                rowActions={rowActions}
                emptyState={emptyState}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Create mode: Configure and launch training
  return (
    <div className="flex-1 flex flex-col bg-db-gray-50">
      <div className="px-6 py-4 border-b border-db-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (onModeChange) onModeChange("browse");
            }}
            className="text-db-gray-400 hover:text-db-gray-600"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-db-gray-900">Configure Training</h1>
            <p className="text-db-gray-600 mt-1">
              Set up train/validation split and choose your foundation model
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main config panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* DSPy Optimization Callout */}
            {selectedAssembly && (
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
                      Use DSPy to automatically optimize your prompt template and select the best few-shot examples before training.
                    </p>
                    <button
                      onClick={() => openModule("dspy-optimization", {
                        stage: "train" as const,
                        assemblyId: selectedAssembly.id,
                        template: selectedAssembly.template_config,
                        mode: "pre-training",
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Wand2 className="w-4 h-4" />
                      Run Optimization
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedAssembly ? (
              <TrainingConfigPanel
                assembly={selectedAssembly}
                onStartTraining={(config) => trainMutation.mutate(config)}
                isTraining={trainMutation.isPending}
              />
            ) : (
              <div className="bg-white rounded-lg border border-db-gray-200 p-8 text-center">
                <Layers className="w-12 h-12 text-db-gray-300 mx-auto mb-4" />
                <p className="text-db-gray-500">Select an assembly to configure training</p>
              </div>
            )}
          </div>

          {/* Sidebar with training runs */}
          <div>
            <TrainingRunsPanel />
          </div>
        </div>
      </div>

      {/* Module Modal */}
      {isModuleOpen && activeModule && selectedAssembly && (
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
                className="p-2 hover:bg-db-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <activeModule.component
                context={{
                  stage: "train" as const,
                  assemblyId: selectedAssembly.id,
                  template: selectedAssembly.template_config,
                  mode: "pre-training",
                }}
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
