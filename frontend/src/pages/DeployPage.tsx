/**
 * DeployPage - DEPLOY stage for model deployment and serving management
 *
 * Features:
 * - One-click model deployment wizard
 * - Live endpoint status monitoring
 * - In-app playground to test deployed models
 * - Tools, Agents, and Endpoints registries
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Loader2,
  Server,
  Rocket,
  Play,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  X,
  AlertCircle,
  Zap,
  Filter,
  Search,
  RotateCcw,
  Shield,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listModels,
  listModelVersions,
  listServingEndpoints,
  deployModel,
  queryServingEndpoint,
  rollbackDeployment,
  type UCModel,
  type UCModelVersion,
  type ServingEndpoint,
} from "../services/api";
import { openDatabricks } from "../services/databricksLinks";
import { useToast } from "../components/Toast";
import { DataTable, Column, RowAction } from "../components/DataTable";
import { GuardrailsPanel } from "../components/GuardrailsPanel";
import { WorkflowBanner } from "../components/WorkflowBanner";
import { StatusBadge } from "../components/StatusBadge";
import {
  ENDPOINT_STATUS_CONFIG,
  getStatusConfig,
  isStatusActive,
} from "../constants/statusConfig";

// ============================================================================
// Deployment Wizard Component
// ============================================================================

interface DeploymentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function DeploymentWizard({
  isOpen,
  onClose,
  onSuccess,
}: DeploymentWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState<UCModel | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<UCModelVersion | null>(
    null,
  );
  const [endpointName, setEndpointName] = useState("");
  const [workloadSize, setWorkloadSize] = useState("Small");
  const [scaleToZero, setScaleToZero] = useState(true);
  const toast = useToast();

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ["deployment-models"],
    queryFn: () => listModels(),
    enabled: isOpen,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ["deployment-versions", selectedModel?.full_name],
    queryFn: () => listModelVersions(selectedModel!.full_name),
    enabled: !!selectedModel,
  });

  const deployMutation = useMutation({
    mutationFn: deployModel,
    onSuccess: (result) => {
      toast.success("Deployment Started", result.message);
      onSuccess();
      onClose();
      resetWizard();
    },
    onError: (error: Error) => {
      toast.error("Deployment Failed", error.message);
    },
  });

  const resetWizard = () => {
    setStep(1);
    setSelectedModel(null);
    setSelectedVersion(null);
    setEndpointName("");
    setWorkloadSize("Small");
    setScaleToZero(true);
  };

  const handleDeploy = () => {
    if (!selectedModel || !selectedVersion) return;

    deployMutation.mutate({
      model_name: selectedModel.full_name,
      model_version: String(selectedVersion.version),
      endpoint_name: endpointName || undefined,
      workload_size: workloadSize,
      scale_to_zero: scaleToZero,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <Rocket className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Deploy Model</h2>
              <p className="text-sm text-db-gray-500">Step {step} of 3</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetWizard();
            }}
            className="text-db-gray-400 hover:text-db-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-db-gray-50 border-b border-db-gray-200">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    s < step
                      ? "bg-cyan-600 text-white"
                      : s === step
                        ? "bg-cyan-100 text-cyan-700 border-2 border-cyan-600"
                        : "bg-db-gray-200 text-db-gray-500",
                  )}
                >
                  {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={clsx(
                      "flex-1 h-1 rounded",
                      s < step ? "bg-cyan-600" : "bg-db-gray-200",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-db-gray-500">
            <span>Select Model</span>
            <span>Choose Version</span>
            <span>Configure</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Model */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-db-gray-800">
                Select a model from Unity Catalog
              </h3>
              {modelsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
                </div>
              ) : models && models.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {models.map((model) => (
                    <button
                      key={model.full_name}
                      onClick={() => setSelectedModel(model)}
                      className={clsx(
                        "w-full p-4 rounded-lg border-2 text-left transition-all",
                        selectedModel?.full_name === model.full_name
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-db-gray-200 hover:border-cyan-300",
                      )}
                    >
                      <div className="font-medium text-db-gray-800">
                        {model.name}
                      </div>
                      <div className="text-sm text-db-gray-500 font-mono">
                        {model.full_name}
                      </div>
                      {model.description && (
                        <div className="text-sm text-db-gray-500 mt-1">
                          {model.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Server className="w-12 h-12 text-db-gray-300 mx-auto mb-4" />
                  <p className="text-db-gray-500">No models found</p>
                  <p className="text-sm text-db-gray-400 mt-1">
                    Train a model first to deploy it
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Version */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-db-gray-800">
                Select model version to deploy
              </h3>
              <div className="p-3 bg-db-gray-50 rounded-lg text-sm">
                <span className="text-db-gray-500">Model:</span>{" "}
                <span className="font-mono">{selectedModel?.full_name}</span>
              </div>
              {versionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
                </div>
              ) : versions && versions.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {versions.map((version) => (
                    <button
                      key={version.version}
                      onClick={() => setSelectedVersion(version)}
                      className={clsx(
                        "w-full p-4 rounded-lg border-2 text-left transition-all",
                        selectedVersion?.version === version.version
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-db-gray-200 hover:border-cyan-300",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          Version {version.version}
                        </span>
                        <span
                          className={clsx(
                            "text-xs px-2 py-1 rounded-full",
                            version.status === "READY"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {version.status}
                        </span>
                      </div>
                      {version.description && (
                        <div className="text-sm text-db-gray-500 mt-1">
                          {version.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-db-gray-500">No versions found</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configure */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-medium text-db-gray-800">
                Configure deployment
              </h3>

              <div className="p-3 bg-db-gray-50 rounded-lg text-sm space-y-1">
                <div>
                  <span className="text-db-gray-500">Model:</span>{" "}
                  <span className="font-mono">{selectedModel?.full_name}</span>
                </div>
                <div>
                  <span className="text-db-gray-500">Version:</span>{" "}
                  <span className="font-medium">
                    {selectedVersion?.version}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-db-gray-700 mb-2">
                  Endpoint Name (optional)
                </label>
                <input
                  type="text"
                  value={endpointName}
                  onChange={(e) => setEndpointName(e.target.value)}
                  placeholder={`${selectedModel?.name?.toLowerCase().replace(/_/g, "-")}-v${selectedVersion?.version}`}
                  className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-db-gray-500 mt-1">
                  Leave blank to auto-generate
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-db-gray-700 mb-2">
                  Workload Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Small", "Medium", "Large"].map((size) => (
                    <button
                      key={size}
                      onClick={() => setWorkloadSize(size)}
                      className={clsx(
                        "px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors",
                        workloadSize === size
                          ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                          : "border-db-gray-200 hover:border-db-gray-300",
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-db-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-db-gray-800">
                    Scale to Zero
                  </div>
                  <div className="text-sm text-db-gray-500">
                    Save costs by scaling down when idle
                  </div>
                </div>
                <button
                  onClick={() => setScaleToZero(!scaleToZero)}
                  className={clsx(
                    "w-12 h-6 rounded-full transition-colors relative",
                    scaleToZero ? "bg-cyan-600" : "bg-db-gray-300",
                  )}
                >
                  <div
                    className={clsx(
                      "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                      scaleToZero ? "translate-x-6" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-db-gray-200">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="px-4 py-2 text-db-gray-700 hover:bg-db-gray-100 rounded-lg"
          >
            {step > 1 ? "Back" : "Cancel"}
          </button>
          <button
            onClick={() => {
              if (step < 3) {
                setStep(step + 1);
              } else {
                handleDeploy();
              }
            }}
            disabled={
              (step === 1 && !selectedModel) ||
              (step === 2 && !selectedVersion) ||
              deployMutation.isPending
            }
            className={clsx(
              "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors",
              (step === 1 && !selectedModel) ||
                (step === 2 && !selectedVersion) ||
                deployMutation.isPending
                ? "bg-db-gray-100 text-db-gray-400 cursor-not-allowed"
                : "bg-cyan-600 text-white hover:bg-cyan-700",
            )}
          >
            {deployMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deploying...
              </>
            ) : step < 3 ? (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Deploy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Endpoint Card Component - Removed (using DataTable now)
// ============================================================================

// ============================================================================
// Playground Component
// ============================================================================

interface PlaygroundProps {
  endpoint: ServingEndpoint | null;
  onClose: () => void;
}

function Playground({ endpoint, onClose }: PlaygroundProps) {
  const [input, setInput] = useState(
    '{\n  "prompt": "Hello, how can I help you?"\n}',
  );
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const queryMutation = useMutation({
    mutationFn: (inputs: Record<string, unknown>) =>
      queryServingEndpoint(endpoint!.name, inputs),
    onSuccess: (result) => {
      setOutput(JSON.stringify(result.predictions, null, 2));
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setOutput(null);
    },
  });

  const handleSubmit = () => {
    try {
      const parsed = JSON.parse(input);
      queryMutation.mutate(parsed);
    } catch (e) {
      toast.error("Invalid JSON", "Please check your input format");
    }
  };

  if (!endpoint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <Zap className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Playground</h2>
              <p className="text-sm text-db-gray-500">{endpoint.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-db-gray-400 hover:text-db-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 p-6">
          {/* Input */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-db-gray-700">
                Input (JSON)
              </label>
              <button
                onClick={handleSubmit}
                disabled={queryMutation.isPending}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  queryMutation.isPending
                    ? "bg-db-gray-100 text-db-gray-400"
                    : "bg-cyan-600 text-white hover:bg-cyan-700",
                )}
              >
                {queryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-2 border border-db-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              placeholder='{"prompt": "..."}'
            />
          </div>

          {/* Output */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-db-gray-700 mb-2">
              Output
            </label>
            <div className="flex-1 p-3 bg-db-gray-50 border border-db-gray-200 rounded-lg overflow-auto">
              {queryMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
                </div>
              ) : error ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <AlertCircle className="w-4 h-4" />
                    Error
                  </div>
                  {error}
                </div>
              ) : output ? (
                <pre className="text-sm font-mono text-db-gray-800 whitespace-pre-wrap">
                  {output}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-db-gray-400 text-sm">
                  Send a request to see the response
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Deployment Browser Modal - Removed (using full-page table view now)
// ============================================================================

// ============================================================================
// Main DeployPage Component
// ============================================================================

interface DeployPageProps {
  mode?: "browse" | "create";
}

export function DeployPage({ mode = "browse" }: DeployPageProps) {
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(mode === "create");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [playgroundEndpoint, setPlaygroundEndpoint] =
    useState<ServingEndpoint | null>(null);
  const [guardrailsEndpoint, setGuardrailsEndpoint] = useState<string | null>(
    null,
  );

  const toast = useToast();

  const {
    data: endpoints,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["serving-endpoints"],
    queryFn: listServingEndpoints,
    refetchInterval: 15000, // Poll every 15s
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ endpointName, targetVersion }: { endpointName: string; targetVersion: string }) =>
      rollbackDeployment(endpointName, targetVersion),
    onSuccess: (result) => {
      toast.success(
        "Rollback Started",
        `Rolling back to version ${result.target_version} (was ${result.previous_version})`,
      );
      queryClient.invalidateQueries({ queryKey: ["serving-endpoints"] });
    },
    onError: (error: Error) => {
      toast.error("Rollback Failed", error.message);
    },
  });

  const filteredEndpoints = (endpoints || []).filter((endpoint) => {
    const matchesSearch = endpoint.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || endpoint.state === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeEndpoints = endpoints?.filter(
    (e) => e.state === "READY" || e.state === "NOT_READY",
  );
  const failedEndpoints = endpoints?.filter((e) => e.state === "FAILED");

  // Define table columns
  const columns: Column<ServingEndpoint>[] = [
    {
      key: "name",
      header: "Endpoint Name",
      width: "30%",
      render: (endpoint) => (
        <div className="flex items-center gap-3">
          <Server className="w-4 h-4 text-cyan-600 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-db-gray-900">{endpoint.name}</div>
            {endpoint.creator && (
              <div className="text-sm text-db-gray-500 truncate">
                Created by {endpoint.creator}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "15%",
      render: (endpoint) => {
        const config = getStatusConfig(endpoint.state, ENDPOINT_STATUS_CONFIG);
        return (
          <StatusBadge
            config={config}
            animate={isStatusActive(endpoint.state)}
          />
        );
      },
    },
    {
      key: "creator",
      header: "Creator",
      width: "15%",
      render: (endpoint) => (
        <span className="text-sm text-db-gray-600">
          {endpoint.creator || "System"}
        </span>
      ),
    },
    {
      key: "config",
      header: "Configuration",
      width: "20%",
      render: (endpoint) => (
        <div className="text-sm text-db-gray-600">
          {endpoint.config_update ? (
            <span className="text-amber-600">Update: {endpoint.config_update}</span>
          ) : (
            <span>Active</span>
          )}
        </div>
      ),
    },
    {
      key: "created",
      header: "Created",
      width: "20%",
      render: (endpoint) => (
        <span className="text-sm text-db-gray-500">
          {endpoint.created_at
            ? new Date(endpoint.created_at).toLocaleString()
            : "N/A"}
        </span>
      ),
    },
  ];

  // Define row actions
  const rowActions: RowAction<ServingEndpoint>[] = [
    {
      label: "Open Playground",
      icon: Play,
      onClick: setPlaygroundEndpoint,
      show: (endpoint) => endpoint.state === "READY",
      className: "text-cyan-600",
    },
    {
      label: "Rollback Version",
      icon: RotateCcw,
      onClick: (endpoint) => {
        const targetVersion = window.prompt(
          `Rollback "${endpoint.name}" to which model version? (e.g., 1, 2, 3)`,
        );
        if (targetVersion) {
          rollbackMutation.mutate({
            endpointName: endpoint.name,
            targetVersion: targetVersion.trim(),
          });
        }
      },
      show: (endpoint) => endpoint.state === "READY",
      className: "text-amber-600",
    },
    {
      label: "Configure Guardrails",
      icon: Shield,
      onClick: (endpoint) => setGuardrailsEndpoint(endpoint.name),
      show: (endpoint) => endpoint.state === "READY",
      className: "text-purple-600",
    },
    {
      label: "Refresh Status",
      icon: RefreshCw,
      onClick: () => refetch(),
    },
    {
      label: "View in Databricks",
      icon: ExternalLink,
      onClick: (endpoint) => openDatabricks.servingEndpoint(endpoint.name),
    },
  ];

  const emptyState = (
    <div className="text-center py-20 bg-white rounded-lg">
      <Server className="w-16 h-16 text-db-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-db-gray-700 mb-2">
        No serving endpoints found
      </h3>
      <p className="text-db-gray-500 mb-6">
        {search || statusFilter
          ? "Try adjusting your filters"
          : "Deploy your first model to create a serving endpoint"}
      </p>
      <button
        onClick={() => setShowWizard(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
      >
        <Rocket className="w-4 h-4" />
        Deploy Model
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-db-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-db-gray-900">Deployments</h1>
              <p className="text-db-gray-600 mt-1">
                Deploy models to Databricks Model Serving
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:text-db-gray-800 hover:bg-db-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => openDatabricks.servingEndpoints()}
                className="flex items-center gap-2 px-4 py-2 border border-cyan-300 text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Model Serving
              </button>
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <Rocket className="w-4 h-4" />
                Deploy Model
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Banner */}
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <WorkflowBanner stage="deploy" />
        </div>
      </div>

      {/* Stats Summary */}
      {endpoints && endpoints.length > 0 && (
        <div className="px-6">
          <div className="max-w-7xl mx-auto mb-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-db-gray-800">
                      {activeEndpoints?.filter((e) => e.state === "READY").length || 0}
                    </div>
                    <div className="text-sm text-db-gray-500">Ready</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-db-gray-800">
                      {activeEndpoints?.filter((e) => e.state === "NOT_READY").length || 0}
                    </div>
                    <div className="text-sm text-db-gray-500">Starting</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-db-gray-800">
                      {failedEndpoints?.length || 0}
                    </div>
                    <div className="text-sm text-db-gray-500">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6">
        <div className="max-w-7xl mx-auto mb-4">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
            <Filter className="w-4 h-4 text-db-gray-400" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
              <input
                type="text"
                placeholder="Filter endpoints by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="READY">Ready</option>
              <option value="NOT_READY">Starting</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
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
              <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            </div>
          ) : (
            <DataTable
              data={filteredEndpoints}
              columns={columns}
              rowKey={(endpoint) => endpoint.name}
              onRowClick={setPlaygroundEndpoint}
              rowActions={rowActions}
              emptyState={emptyState}
            />
          )}
        </div>
      </div>

      {/* Deployment Wizard Modal */}
      <DeploymentWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["serving-endpoints"] });
        }}
      />

      {/* Playground Modal */}
      <Playground
        endpoint={playgroundEndpoint}
        onClose={() => setPlaygroundEndpoint(null)}
      />

      {/* Guardrails Panel */}
      {guardrailsEndpoint && (
        <GuardrailsPanel
          endpointName={guardrailsEndpoint}
          onClose={() => setGuardrailsEndpoint(null)}
        />
      )}
    </div>
  );
}
