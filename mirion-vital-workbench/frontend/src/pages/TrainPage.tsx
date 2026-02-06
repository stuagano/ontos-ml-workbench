/**
 * TrainPage - TRAIN stage for fine-tuning models on assembled datasets
 *
 * Refactored to use training job components:
 * - Browse mode: List all training jobs with status
 * - Create mode: Select assembly and configure training job
 * - Detail mode: Monitor job progress and view results
 *
 * All state comes from backend - frontend is pure visualization
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  ExternalLink,
  Loader2,
  Layers,
  RefreshCw,
  Filter,
  Search,
  Wand2,
  CheckCircle,
  Clock,
  AlertCircle,
  Database,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { clsx } from "clsx";
import { listAssemblies } from "../services/api";
import { openDatabricks } from "../services/databricksLinks";
import { DataTable, Column, RowAction } from "../components/DataTable";
import { TrainingJobCreateForm } from "../components/TrainingJobCreateForm";
import { TrainingJobList } from "../components/TrainingJobList";
import { TrainingJobDetail } from "../components/TrainingJobDetail";
import { useModules } from "../hooks/useModules";
import type { AssembledDataset, AssemblyStatus } from "../types";

// ============================================================================
// Main TrainPage Component
// ============================================================================

interface TrainPageProps {
  mode?: "browse" | "create";
  onModeChange?: (mode: "browse" | "create") => void;
}

export function TrainPage({ mode = "browse", onModeChange }: TrainPageProps) {
  // UI state (not business logic!)
  const [view, setView] = useState<"jobs" | "assemblies" | "create" | "detail">(
    "jobs",
  );
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(
    null,
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssemblyStatus | "">("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    openModule,
    activeModule,
    isOpen: isModuleOpen,
    closeModule,
  } = useModules({ stage: "train" });

  // Fetch all assemblies (for assembly selection)
  const { data: assemblies, isLoading: loadingAssemblies } = useQuery({
    queryKey: ["assemblies"],
    queryFn: () => listAssemblies(),
  });

  const filteredAssemblies = (assemblies || []).filter((assembly) => {
    const matchesSearch = (assembly.sheet_name || assembly.id)
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = !statusFilter || assembly.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedAssembly = assemblies?.find((a) => a.id === selectedAssemblyId);

  // Handlers
  const handleSelectAssembly = (assembly: AssembledDataset) => {
    setSelectedAssemblyId(assembly.id);
    setView("create");
  };

  const handleJobCreated = (jobId: string) => {
    setSelectedJobId(jobId);
    setView("detail");
    toast({
      title: "Training Job Created",
      description: "Job has been submitted successfully",
    });
  };

  const handleCancelCreate = () => {
    setSelectedAssemblyId(null);
    setView("jobs");
  };

  const handleBackToJobs = () => {
    setSelectedJobId(null);
    setView("jobs");
  };

  const statusConfig: Record<
    AssemblyStatus,
    { icon: typeof CheckCircle; color: string; label: string }
  > = {
    ready: {
      icon: CheckCircle,
      color: "text-green-700 bg-green-50",
      label: "Ready",
    },
    assembling: {
      icon: Clock,
      color: "text-amber-700 bg-amber-50",
      label: "Assembling",
    },
    failed: {
      icon: AlertCircle,
      color: "text-red-700 bg-red-50",
      label: "Failed",
    },
    archived: {
      icon: Database,
      color: "text-gray-700 bg-gray-50",
      label: "Archived",
    },
  };

  // ============================================================================
  // VIEW: Training Jobs List
  // ============================================================================

  if (view === "jobs") {
    return (
      <div className="flex-1 flex flex-col bg-db-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-db-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-db-gray-900">
                  Training Jobs
                </h1>
                <p className="text-db-gray-600 mt-1">
                  Monitor fine-tuning jobs and view training results
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("assemblies")}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  New Training Job
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

        {/* Jobs List */}
        <div className="flex-1 px-6 py-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <TrainingJobList
              onSelectJob={(jobId) => {
                setSelectedJobId(jobId);
                setView("detail");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW: Select Assembly (before creating job)
  // ============================================================================

  if (view === "assemblies") {
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
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit",
                status.color,
              )}
            >
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
          const labeledCount =
            assembly.human_labeled_count + assembly.human_verified_count;
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
          const labeledCount =
            assembly.human_labeled_count + assembly.human_verified_count;
          const totalUsable = assembly.ai_generated_count + labeledCount;
          const readyForTraining =
            assembly.status === "ready" && totalUsable >= 10;
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
        label: "Select for Training",
        icon: Play,
        onClick: handleSelectAssembly,
        className: "text-green-600",
      },
      {
        label: "View in Databricks",
        icon: ExternalLink,
        onClick: (assembly) => {
          window.open(
            `${window.location.origin}/databricks/assemblies/${assembly.id}`,
            "_blank",
          );
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
            : "Create an assembly in the Generate stage by applying a template to your data"}
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
                <button
                  onClick={() => setView("jobs")}
                  className="text-db-gray-400 hover:text-db-gray-600 mb-2"
                >
                  ← Back to Jobs
                </button>
                <h1 className="text-2xl font-bold text-db-gray-900">
                  Select Training Dataset
                </h1>
                <p className="text-db-gray-600 mt-1">
                  Choose an assembled dataset to train a fine-tuned model
                </p>
              </div>
              <button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["assemblies"] })
                }
                className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:text-db-gray-800 hover:bg-db-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
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
                onChange={(e) =>
                  setStatusFilter(e.target.value as AssemblyStatus | "")
                }
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
            {loadingAssemblies ? (
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

  // ============================================================================
  // VIEW: Create Training Job
  // ============================================================================

  if (view === "create" && selectedAssembly) {
    return (
      <div className="flex-1 flex flex-col bg-db-gray-50">
        <div className="px-6 py-4 border-b border-db-gray-200 bg-white">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleCancelCreate}
              className="text-db-gray-400 hover:text-db-gray-600 mb-2"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-db-gray-900">
              Configure Training Job
            </h1>
            <p className="text-db-gray-600 mt-1">
              Set up your fine-tuning configuration and hyperparameters
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* DSPy Optimization Callout */}
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
                    Use DSPy to automatically optimize your prompt template and
                    select the best few-shot examples before training.
                  </p>
                  <button
                    onClick={() =>
                      openModule("dspy-optimization", {
                        stage: "train" as const,
                        assemblyId: selectedAssembly.id,
                        template: selectedAssembly.template_config,
                        mode: "pre-training",
                      })
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                    Run Optimization
                  </button>
                </div>
              </div>
            </div>

            {/* Training Job Form */}
            <div className="bg-white border border-db-gray-200 rounded-lg p-6">
              <TrainingJobCreateForm
                assembly={selectedAssembly}
                onSuccess={handleJobCreated}
                onCancel={handleCancelCreate}
              />
            </div>
          </div>
        </div>

        {/* Module Modal */}
        {isModuleOpen && activeModule && (
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
                    <h2 className="text-xl font-semibold">
                      {activeModule.name}
                    </h2>
                    <p className="text-sm text-db-gray-500">
                      {activeModule.description}
                    </p>
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

  // ============================================================================
  // VIEW: Training Job Detail
  // ============================================================================

  if (view === "detail" && selectedJobId) {
    return (
      <div className="flex-1 flex flex-col bg-db-gray-50">
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <TrainingJobDetail
              jobId={selectedJobId}
              onBack={handleBackToJobs}
            />
          </div>
        </div>
      </div>
    );
  }

  // Fallback (shouldn't happen)
  return (
    <div className="flex-1 flex items-center justify-center bg-db-gray-50">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-db-gray-900">Invalid State</h3>
        <button
          onClick={() => setView("jobs")}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Back to Jobs
        </button>
      </div>
    </div>
  );
}
