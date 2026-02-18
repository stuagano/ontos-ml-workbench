/**
 * DSPyOptimizationPage - Launch and monitor DSPy optimization runs
 *
 * Provides UI for:
 * - Exporting templates as DSPy code
 * - Launching optimization runs
 * - Monitoring progress in real-time
 * - Viewing and accepting results
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  RefreshCw,
  Download,
  Code,
  Zap,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  Copy,
  Settings,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import {
  getDSPyProgram,
  exportToDSPy,
  createOptimizationRun,
  getOptimizationRun,
  cancelOptimizationRun,
  syncOptimizationResults,
} from "../services/api";
import { useToast } from "../components/Toast";
import type {
  Template,
  DSPyExportResult,
  OptimizationRunResponse,
  OptimizationConfig,
  DSPyOptimizerType,
} from "../types";
import { DEFAULT_OPTIMIZATION_CONFIG, DSPY_OPTIMIZERS } from "../types";

// ============================================================================
// Code Preview Component
// ============================================================================

function CodePreview({
  code,
  title,
  onCopy,
}: {
  code: string;
  title: string;
  onCopy: () => void;
}) {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-sm text-gray-300 font-medium">{title}</span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
      </div>
      <pre className="p-4 text-sm text-green-400 overflow-x-auto max-h-96">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ============================================================================
// Optimization Config Panel
// ============================================================================

function OptimizationConfigPanel({
  config,
  onChange,
}: {
  config: OptimizationConfig;
  onChange: (config: OptimizationConfig) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-db-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-db-gray-500" />
          <span className="font-medium text-db-gray-700">
            Optimization Settings
          </span>
        </div>
        <ChevronDown
          className={clsx(
            "w-4 h-4 text-db-gray-400 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-db-gray-200 space-y-4">
          {/* Optimizer Type */}
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-1">
              Optimizer
            </label>
            <select
              value={config.optimizer_type}
              onChange={(e) =>
                onChange({
                  ...config,
                  optimizer_type: e.target.value as DSPyOptimizerType,
                })
              }
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {DSPY_OPTIMIZERS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-db-gray-500">
              {
                DSPY_OPTIMIZERS.find((o) => o.id === config.optimizer_type)
                  ?.description
              }
            </p>
          </div>

          {/* Grid of numeric inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Max Bootstrapped Demos
              </label>
              <input
                type="number"
                value={config.max_bootstrapped_demos}
                onChange={(e) =>
                  onChange({
                    ...config,
                    max_bootstrapped_demos: parseInt(e.target.value) || 4,
                  })
                }
                min={1}
                max={20}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Max Labeled Demos
              </label>
              <input
                type="number"
                value={config.max_labeled_demos}
                onChange={(e) =>
                  onChange({
                    ...config,
                    max_labeled_demos: parseInt(e.target.value) || 16,
                  })
                }
                min={1}
                max={100}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Number of Trials
              </label>
              <input
                type="number"
                value={config.num_trials}
                onChange={(e) =>
                  onChange({
                    ...config,
                    num_trials: parseInt(e.target.value) || 100,
                  })
                }
                min={10}
                max={1000}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Max Runtime (minutes)
              </label>
              <input
                type="number"
                value={config.max_runtime_minutes}
                onChange={(e) =>
                  onChange({
                    ...config,
                    max_runtime_minutes: parseInt(e.target.value) || 60,
                  })
                }
                min={5}
                max={240}
                className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Metric */}
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-1">
              Optimization Metric
            </label>
            <input
              type="text"
              value={config.metric_name}
              onChange={(e) =>
                onChange({ ...config, metric_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="accuracy"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Progress Indicator
// ============================================================================

function OptimizationProgress({ run }: { run: OptimizationRunResponse }) {
  const progress =
    run.trials_total > 0
      ? Math.round((run.trials_completed / run.trials_total) * 100)
      : 0;

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    running: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const StatusIcon = {
    pending: Clock,
    running: RefreshCw,
    completed: CheckCircle,
    failed: XCircle,
    cancelled: Pause,
  }[run.status];

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <div
          className={clsx(
            "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
            statusColors[run.status]
          )}
        >
          <StatusIcon
            className={clsx(
              "w-4 h-4",
              run.status === "running" && "animate-spin"
            )}
          />
          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
        </div>

        {run.current_best_score !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-medium">
              Best: {(run.current_best_score * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-db-gray-600">
          <span>
            {run.trials_completed} / {run.trials_total} trials
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-db-gray-200 rounded-full overflow-hidden">
          <div
            className={clsx(
              "h-full transition-all duration-500",
              run.status === "completed" ? "bg-green-500" : "bg-purple-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timing */}
      {run.started_at && (
        <div className="mt-3 text-xs text-db-gray-500">
          Started: {new Date(run.started_at).toLocaleString()}
          {run.estimated_completion && run.status === "running" && (
            <span className="ml-4">
              Est. completion:{" "}
              {new Date(run.estimated_completion).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Results Panel
// ============================================================================

function OptimizationResultsPanel({
  run,
  onSync,
  isSyncing,
}: {
  run: OptimizationRunResponse;
  onSync: () => void;
  isSyncing: boolean;
}) {
  if (run.status !== "completed") return null;

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4 space-y-4">
      <h3 className="font-semibold text-db-gray-800">Optimization Results</h3>

      {/* Best Score */}
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
        <div>
          <div className="text-sm text-green-700">Best Score</div>
          <div className="text-2xl font-bold text-green-800">
            {run.best_score !== undefined
              ? `${(run.best_score * 100).toFixed(1)}%`
              : "N/A"}
          </div>
        </div>
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>

      {/* Top Examples */}
      {run.top_example_ids.length > 0 && (
        <div>
          <div className="text-sm font-medium text-db-gray-700 mb-2">
            Top Performing Examples
          </div>
          <div className="flex flex-wrap gap-2">
            {run.top_example_ids.slice(0, 5).map((id) => (
              <span
                key={id}
                className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono"
              >
                {id.slice(0, 8)}...
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sync Button */}
      <button
        onClick={onSync}
        disabled={isSyncing}
        className={clsx(
          "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors",
          isSyncing
            ? "bg-db-gray-100 text-db-gray-400 cursor-not-allowed"
            : "bg-purple-600 text-white hover:bg-purple-700"
        )}
      >
        <RefreshCw
          className={clsx("w-4 h-4", isSyncing && "animate-spin")}
        />
        {isSyncing ? "Syncing..." : "Sync Results to Example Store"}
      </button>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

interface DSPyOptimizationPageProps {
  template: Template;
  onClose: () => void;
}

export function DSPyOptimizationPage({
  template,
  onClose,
}: DSPyOptimizationPageProps) {
  const [activeTab, setActiveTab] = useState<"export" | "optimize">("export");
  const [config, setConfig] = useState<OptimizationConfig>(
    DEFAULT_OPTIMIZATION_CONFIG
  );
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<DSPyExportResult | null>(
    null
  );

  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch DSPy program
  const { data: program } = useQuery({
    queryKey: ["dspy-program", template.id],
    queryFn: () => getDSPyProgram(template.id, { max_examples: 10 }),
  });

  // Fetch active run status
  const { data: activeRun, refetch: refetchRun } = useQuery({
    queryKey: ["dspy-run", activeRunId],
    queryFn: () => getOptimizationRun(activeRunId!),
    enabled: !!activeRunId,
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 3000 : false,
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () =>
      exportToDSPy(template.id, {
        include_examples: true,
        max_examples: 10,
        include_optimizer_setup: true,
      }),
    onSuccess: (result) => {
      setExportResult(result);
      toast.success("Code exported", "DSPy code generated successfully");
    },
    onError: (error) => toast.error("Export failed", error.message),
  });

  // Create run mutation
  const createRunMutation = useMutation({
    mutationFn: () =>
      createOptimizationRun({
        databit_id: template.id,
        config,
      }),
    onSuccess: (run) => {
      setActiveRunId(run.run_id);
      toast.success("Optimization started", `Run ${run.run_id.slice(0, 8)}...`);
    },
    onError: (error) => toast.error("Failed to start", error.message),
  });

  // Cancel run mutation
  const cancelRunMutation = useMutation({
    mutationFn: () => cancelOptimizationRun(activeRunId!),
    onSuccess: () => {
      toast.info("Run cancelled");
      refetchRun();
    },
    onError: (error) => toast.error("Cancel failed", error.message),
  });

  // Sync results mutation
  const syncResultsMutation = useMutation({
    mutationFn: () => syncOptimizationResults(activeRunId!),
    onSuccess: (result) => {
      toast.success(
        "Results synced",
        `Updated ${result.examples_updated} examples`
      );
      queryClient.invalidateQueries({ queryKey: ["examples"] });
    },
    onError: (error) => toast.error("Sync failed", error.message),
  });

  const handleCopyCode = () => {
    if (exportResult?.program_code) {
      navigator.clipboard.writeText(exportResult.program_code);
      toast.info("Copied to clipboard");
    }
  };

  const handleDownload = () => {
    if (exportResult?.program_code) {
      const blob = new Blob([exportResult.program_code], {
        type: "text/x-python",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${program?.program_name || "dspy_program"}.py`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-db-gray-800">
              DSPy Integration
            </h2>
            <p className="text-sm text-db-gray-500">
              Template: {template.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-db-gray-400 hover:text-db-gray-600 rounded-lg hover:bg-db-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-db-gray-200">
          <button
            onClick={() => setActiveTab("export")}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "export"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-db-gray-500 hover:text-db-gray-700"
            )}
          >
            <Code className="w-4 h-4" />
            Export Code
          </button>
          <button
            onClick={() => setActiveTab("optimize")}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "optimize"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-db-gray-500 hover:text-db-gray-700"
            )}
          >
            <Zap className="w-4 h-4" />
            Optimize
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "export" ? (
            <div className="space-y-6">
              {/* Program Info */}
              {program && (
                <div className="bg-db-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-db-gray-800 mb-2">
                    {program.program_name}
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-db-gray-500">Signature:</span>
                      <span className="ml-2 font-mono text-purple-600">
                        {program.signature.signature_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-db-gray-500">Module:</span>
                      <span className="ml-2">
                        {program.module_config.module_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-db-gray-500">Examples:</span>
                      <span className="ml-2">
                        {program.training_examples.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Export Button */}
              {!exportResult && (
                <button
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    exportMutation.isPending
                      ? "bg-db-gray-100 text-db-gray-400"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  )}
                >
                  {exportMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Code className="w-4 h-4" />
                  )}
                  {exportMutation.isPending
                    ? "Generating..."
                    : "Generate DSPy Code"}
                </button>
              )}

              {/* Code Preview */}
              {exportResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-db-gray-100 text-db-gray-700 rounded-lg hover:bg-db-gray-200 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download .py
                    </button>
                    {exportResult.is_valid ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Valid Python
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-red-600">
                        <XCircle className="w-4 h-4" />
                        Validation errors
                      </span>
                    )}
                  </div>

                  <CodePreview
                    code={exportResult.program_code}
                    title={`${program?.program_name || "program"}.py`}
                    onCopy={handleCopyCode}
                  />

                  {exportResult.examples_json && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-db-gray-600 hover:text-db-gray-800">
                        View examples JSON ({exportResult.num_examples_included}{" "}
                        examples)
                      </summary>
                      <pre className="mt-2 p-3 bg-db-gray-100 rounded-lg overflow-x-auto text-xs">
                        {exportResult.examples_json}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Config Panel */}
              <OptimizationConfigPanel config={config} onChange={setConfig} />

              {/* Launch Button */}
              {!activeRun && (
                <button
                  onClick={() => createRunMutation.mutate()}
                  disabled={createRunMutation.isPending}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    createRunMutation.isPending
                      ? "bg-db-gray-100 text-db-gray-400"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  )}
                >
                  {createRunMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {createRunMutation.isPending
                    ? "Starting..."
                    : "Start Optimization"}
                </button>
              )}

              {/* Progress */}
              {activeRun && (
                <>
                  <OptimizationProgress run={activeRun} />

                  {activeRun.status === "running" && (
                    <button
                      onClick={() => cancelRunMutation.mutate()}
                      disabled={cancelRunMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      Cancel Run
                    </button>
                  )}

                  <OptimizationResultsPanel
                    run={activeRun}
                    onSync={() => syncResultsMutation.mutate()}
                    isSyncing={syncResultsMutation.isPending}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
