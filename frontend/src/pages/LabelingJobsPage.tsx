/**
 * LabelingJobsPage - Enterprise labeling workflow management
 *
 * NOTE: For most use cases, use CuratePage with TrainingSheet instead.
 * This page is for advanced enterprise workflows with:
 * - Formal task assignment to multiple labelers
 * - Review/approval workflows
 * - Progress tracking across teams
 *
 * Features:
 * - List and manage labeling jobs
 * - Create jobs from AI Sheets (legacy) or Training Sheets
 * - View job progress and statistics
 * - Navigate to task management and annotation interface
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Loader2,
  Tag,
  Pause,
  Play,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Trash2,
  ChevronRight,
  AlertCircle,
  X,
  RefreshCw,
  Filter,
  Search,
  Eye,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listLabelingJobs,
  getLabelingJobStats,
  createLabelingJob,
  startLabelingJob,
  pauseLabelingJob,
  resumeLabelingJob,
  deleteLabelingJob,
  listSheets,
} from "../services/api";
import { useToast } from "../components/Toast";
import { DataTable, Column, RowAction } from "../components/DataTable";
import type {
  LabelingJob,
  LabelingJobCreateRequest,
  LabelingJobStatus,
  Sheet,
  LabelField,
  LabelFieldType,
} from "../types";

// ============================================================================
// Status Helpers
// ============================================================================

const statusColors: Record<LabelingJobStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
};

const statusLabels: Record<LabelingJobStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

// ============================================================================
// Progress Bar Component
// ============================================================================

function ProgressBar({
  labeled,
  reviewed,
  approved,
  total,
}: {
  labeled: number;
  reviewed: number;
  approved: number;
  total: number;
}) {
  if (total === 0) return null;

  const labeledPct = (labeled / total) * 100;
  const reviewedPct = (reviewed / total) * 100;
  const approvedPct = (approved / total) * 100;

  return (
    <div className="space-y-1">
      <div className="h-2 bg-db-gray-100 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${approvedPct}%` }}
          title={`Approved: ${approved}`}
        />
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${reviewedPct - approvedPct}%` }}
          title={`Reviewed: ${reviewed - approved}`}
        />
        <div
          className="h-full bg-amber-400 transition-all duration-300"
          style={{ width: `${labeledPct - reviewedPct}%` }}
          title={`Labeled: ${labeled - reviewed}`}
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-db-gray-500">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {approved} approved
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          {reviewed} reviewed
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          {labeled} labeled
        </span>
        <span className="text-db-gray-400">of {total}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Job Card Component - Removed (using DataTable now)
// ============================================================================

// ============================================================================
// Create Job Modal
// ============================================================================

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (job: LabelingJob) => void;
}

function CreateJobModal({ isOpen, onClose, onCreated }: CreateJobModalProps) {
  const toast = useToast();
  const [step, setStep] = useState<"sheet" | "config">("sheet");
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetColumns: [] as string[],
    instructions: "",
    aiAssistEnabled: true,
    aiModel: "databricks-meta-llama-3-3-70b-instruct",
    batchSize: 50,
    labelFields: [] as LabelField[],
  });

  // Fetch sheets
  const { data: sheetsData, isLoading: sheetsLoading } = useQuery({
    queryKey: ["sheets"],
    queryFn: () => listSheets({ status: "published" }),
    enabled: isOpen,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createLabelingJob,
    onSuccess: (job) => {
      toast.success("Job Created", `Created labeling job: ${job.name}`);
      onCreated(job);
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Error", error.message);
    },
  });

  const resetForm = () => {
    setStep("sheet");
    setSelectedSheet(null);
    setFormData({
      name: "",
      description: "",
      targetColumns: [],
      instructions: "",
      aiAssistEnabled: true,
      aiModel: "databricks-meta-llama-3-3-70b-instruct",
      batchSize: 50,
      labelFields: [],
    });
  };

  const handleSheetSelect = (sheet: Sheet) => {
    setSelectedSheet(sheet);
    setFormData((prev) => ({
      ...prev,
      name: `Label: ${sheet.name}`,
      // Pre-select AI columns as target columns
      targetColumns: (sheet.columns ?? [])
        .filter((c) => c.source_type === "generated")
        .map((c) => c.id),
      // Auto-create label fields from AI columns
      labelFields: (sheet.columns ?? [])
        .filter((c) => c.source_type === "generated")
        .map((c) => ({
          id: c.id,
          name: c.name,
          field_type: inferFieldType(c.data_type) as LabelFieldType,
          required: true,
        })),
    }));
    setStep("config");
  };

  const inferFieldType = (dataType: string): string => {
    switch (dataType) {
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      default:
        return "text";
    }
  };

  const addLabelField = () => {
    setFormData((prev) => ({
      ...prev,
      labelFields: [
        ...prev.labelFields,
        {
          id: `field_${Date.now()}`,
          name: "",
          field_type: "text" as LabelFieldType,
          required: true,
        },
      ],
    }));
  };

  const updateLabelField = (index: number, updates: Partial<LabelField>) => {
    setFormData((prev) => ({
      ...prev,
      labelFields: prev.labelFields.map((f, i) =>
        i === index ? { ...f, ...updates } : f,
      ),
    }));
  };

  const removeLabelField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      labelFields: prev.labelFields.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!selectedSheet || !formData.name.trim()) {
      toast.error("Validation Error", "Please fill in all required fields");
      return;
    }

    if (formData.labelFields.length === 0) {
      toast.error("Validation Error", "Please add at least one label field");
      return;
    }

    const request: LabelingJobCreateRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      sheet_id: selectedSheet.id,
      target_columns: formData.targetColumns,
      label_schema: {
        fields: formData.labelFields,
      },
      instructions: formData.instructions.trim() || undefined,
      ai_assist_enabled: formData.aiAssistEnabled,
      ai_model: formData.aiAssistEnabled ? formData.aiModel : undefined,
      default_batch_size: formData.batchSize,
    };

    createMutation.mutate(request);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-db-gray-800">
              Create Labeling Job
            </h2>
            <p className="text-sm text-db-gray-500">
              {step === "sheet"
                ? "Select a sheet to create labels from"
                : "Configure the labeling job"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === "sheet" ? (
            <div className="space-y-4">
              {sheetsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-db-orange" />
                </div>
              ) : !sheetsData?.sheets.length ? (
                <div className="text-center py-12">
                  <FileSpreadsheet className="w-12 h-12 text-db-gray-300 mx-auto mb-3" />
                  <p className="text-db-gray-500">
                    No published sheets available
                  </p>
                  <p className="text-sm text-db-gray-400">
                    Create and publish an AI Sheet first
                  </p>
                </div>
              ) : (
                sheetsData.sheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    onClick={() => handleSheetSelect(sheet)}
                    className="w-full text-left p-4 rounded-lg border border-db-gray-200 hover:border-db-orange hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-db-gray-800">
                          {sheet.name}
                        </h3>
                        {sheet.description && (
                          <p className="text-sm text-db-gray-500 mt-0.5">
                            {sheet.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-db-gray-400">
                          <span>{sheet.columns?.length ?? 0} columns</span>
                          <span>{sheet.item_count || 0} rows</span>
                          <span>
                            {
                              (sheet.columns ?? []).filter(
                                (c) => c.source_type === "generated",
                              ).length
                            }{" "}
                            AI columns
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-db-gray-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-db-gray-700 mb-1">
                    Job Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
                    placeholder="e.g., Defect Classification"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-db-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
                    placeholder="Describe what labelers should do..."
                  />
                </div>
              </div>

              {/* Label Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-db-gray-700">
                    Label Fields
                  </label>
                  <button
                    onClick={addLabelField}
                    className="text-sm text-db-orange hover:text-db-red flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Field
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.labelFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-3 p-3 bg-db-gray-50 rounded-lg"
                    >
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) =>
                          updateLabelField(index, { name: e.target.value })
                        }
                        className="flex-1 px-2 py-1.5 border border-db-gray-300 rounded text-sm"
                        placeholder="Field name"
                      />
                      <select
                        value={field.field_type}
                        onChange={(e) =>
                          updateLabelField(index, {
                            field_type: e.target.value as LabelFieldType,
                          })
                        }
                        className="px-2 py-1.5 border border-db-gray-300 rounded text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="select">Single Select</option>
                        <option value="multi_select">Multi Select</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </select>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateLabelField(index, {
                              required: e.target.checked,
                            })
                          }
                        />
                        Required
                      </label>
                      <button
                        onClick={() => removeLabelField(index)}
                        className="p-1 text-db-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {formData.labelFields.length === 0 && (
                    <p className="text-sm text-db-gray-400 text-center py-4">
                      No label fields defined. Add fields for labelers to fill
                      in.
                    </p>
                  )}
                </div>
              </div>

              {/* AI Assist */}
              <div className="p-4 bg-purple-50 rounded-lg space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.aiAssistEnabled}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        aiAssistEnabled: e.target.checked,
                      }))
                    }
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-purple-800">
                    Enable AI Pre-labeling
                  </span>
                </label>

                {formData.aiAssistEnabled && (
                  <div>
                    <label className="block text-xs text-purple-600 mb-1">
                      AI Model
                    </label>
                    <select
                      value={formData.aiModel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          aiModel: e.target.value,
                        }))
                      }
                      className="w-full px-2 py-1.5 border border-purple-200 rounded text-sm bg-white"
                    >
                      <option value="databricks-meta-llama-3-3-70b-instruct">
                        Llama 3.3 70B Instruct
                      </option>
                      <option value="databricks-meta-llama-3-1-405b-instruct">
                        Llama 3.1 405B Instruct
                      </option>
                      <option value="databricks-claude-3-5-sonnet">
                        Claude 3.5 Sonnet
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-db-gray-700 mb-1">
                  Instructions for Labelers (Markdown)
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange font-mono text-sm"
                  placeholder="## Guidelines&#10;- Check the image carefully&#10;- Select all applicable defects&#10;..."
                />
              </div>

              {/* Batch Size */}
              <div>
                <label className="block text-sm font-medium text-db-gray-700 mb-1">
                  Default Batch Size
                </label>
                <input
                  type="number"
                  value={formData.batchSize}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      batchSize: parseInt(e.target.value) || 50,
                    }))
                  }
                  min={1}
                  max={500}
                  className="w-32 px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
                />
                <p className="text-xs text-db-gray-400 mt-1">
                  Items per task/batch assigned to labelers
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-db-gray-200 bg-db-gray-50">
          {step === "config" ? (
            <>
              <button
                onClick={() => setStep("sheet")}
                className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 flex items-center gap-2"
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Create Job
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800"
              >
                Cancel
              </button>
              <div />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Stats Modal
// ============================================================================

interface StatsModalProps {
  job: LabelingJob;
  isOpen: boolean;
  onClose: () => void;
}

function StatsModal({ job, isOpen, onClose }: StatsModalProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["labeling-job-stats", job.id],
    queryFn: () => getLabelingJobStats(job.id),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-lg font-semibold text-db-gray-800">
            {job.name} - Statistics
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-db-orange" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-db-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-db-gray-800">
                  {stats.total_items}
                </div>
                <div className="text-sm text-db-gray-500">Total Items</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.approved_items}
                </div>
                <div className="text-sm text-green-600">Approved</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.reviewed_items}
                </div>
                <div className="text-sm text-blue-600">Reviewed</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  {stats.labeled_items}
                </div>
                <div className="text-sm text-amber-600">Labeled</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.ai_labeled_items}
                </div>
                <div className="text-sm text-purple-600">AI Labeled</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {stats.flagged_items}
                </div>
                <div className="text-sm text-red-600">Flagged</div>
              </div>

              {stats.ai_human_agreement_rate !== undefined && (
                <div className="col-span-2 p-4 bg-db-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-db-gray-600">
                      AI-Human Agreement Rate
                    </span>
                    <span className="text-lg font-semibold text-db-gray-800">
                      {(stats.ai_human_agreement_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {stats.labels_per_hour !== undefined && (
                <div className="col-span-2 p-4 bg-db-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-db-gray-600">
                      Labels per Hour
                    </span>
                    <span className="text-lg font-semibold text-db-gray-800">
                      {stats.labels_per_hour.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-db-gray-500">
              No statistics available
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-db-gray-200 bg-db-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-db-gray-200 text-db-gray-700 rounded-lg hover:bg-db-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Job Browser Modal - Removed (using full-page table view now)
// ============================================================================

// ============================================================================
// Main Page Component
// ============================================================================

interface LabelingJobsPageProps {
  onViewTasks?: (job: LabelingJob) => void;
}

export function LabelingJobsPage({ onViewTasks }: LabelingJobsPageProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statsJob, setStatsJob] = useState<LabelingJob | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LabelingJobStatus | "">("");

  // Fetch jobs
  const { data, isLoading, error } = useQuery({
    queryKey: ["labeling-jobs", search, statusFilter],
    queryFn: () =>
      listLabelingJobs({
        status: statusFilter || undefined,
        limit: 100,
      }),
  });

  const jobs = data?.jobs || [];
  const filteredJobs = jobs.filter((job) =>
    job.name.toLowerCase().includes(search.toLowerCase())
  );

  // Mutations
  const startMutation = useMutation({
    mutationFn: (jobId: string) => startLabelingJob(jobId),
    onSuccess: (job) => {
      toast.success("Job Started", `${job.name} is now active`);
      queryClient.invalidateQueries({ queryKey: ["labeling-jobs"] });
    },
    onError: (error: Error) => {
      toast.error("Error", error.message);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (jobId: string) => pauseLabelingJob(jobId),
    onSuccess: (job) => {
      toast.success("Job Paused", `${job.name} has been paused`);
      queryClient.invalidateQueries({ queryKey: ["labeling-jobs"] });
    },
    onError: (error: Error) => {
      toast.error("Error", error.message);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (jobId: string) => resumeLabelingJob(jobId),
    onSuccess: (job) => {
      toast.success("Job Resumed", `${job.name} is now active`);
      queryClient.invalidateQueries({ queryKey: ["labeling-jobs"] });
    },
    onError: (error: Error) => {
      toast.error("Error", error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => deleteLabelingJob(jobId),
    onSuccess: () => {
      toast.success("Job Deleted", "Labeling job has been deleted");
      queryClient.invalidateQueries({ queryKey: ["labeling-jobs"] });
    },
    onError: (error: Error) => {
      toast.error("Error", error.message);
    },
  });

  const handleViewTasks = useCallback(
    (job: LabelingJob) => {
      if (onViewTasks) {
        onViewTasks(job);
      } else {
        toast.info("Coming Soon", "Task board view is under development");
      }
    },
    [onViewTasks, toast],
  );

  // Define table columns
  const columns: Column<LabelingJob>[] = [
    {
      key: "name",
      header: "Job Name",
      width: "25%",
      render: (job) => (
        <div className="flex items-center gap-3">
          <Tag className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-db-gray-900">{job.name}</div>
            {job.description && (
              <div className="text-sm text-db-gray-500 truncate">
                {job.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "12%",
      render: (job) => (
        <span
          className={clsx("px-2 py-1 rounded-full text-xs font-medium", statusColors[job.status])}
        >
          {statusLabels[job.status]}
        </span>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      width: "30%",
      render: (job) => (
        <div className="min-w-0">
          <ProgressBar
            labeled={job.labeled_items}
            reviewed={job.reviewed_items}
            approved={job.approved_items}
            total={job.total_items}
          />
        </div>
      ),
    },
    {
      key: "features",
      header: "Features",
      width: "18%",
      render: (job) => (
        <div className="flex items-center gap-3 text-sm text-db-gray-600">
          <span className="flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {(job.target_columns || []).length}
          </span>
          {job.ai_assist_enabled && (
            <span className="flex items-center gap-1 text-purple-600">
              <Settings className="w-3.5 h-3.5" />
              AI
            </span>
          )}
        </div>
      ),
    },
    {
      key: "updated",
      header: "Last Updated",
      width: "15%",
      render: (job) => (
        <span className="text-sm text-db-gray-500">
          {job.updated_at
            ? new Date(job.updated_at).toLocaleDateString()
            : "N/A"}
        </span>
      ),
    },
  ];

  // Define row actions
  const rowActions: RowAction<LabelingJob>[] = [
    {
      label: "View Tasks",
      icon: Eye,
      onClick: handleViewTasks,
      className: "text-orange-600",
    },
    {
      label: "View Statistics",
      icon: BarChart3,
      onClick: setStatsJob,
    },
    {
      label: "Start Job",
      icon: Play,
      onClick: (job) => startMutation.mutate(job.id),
      show: (job) => job.status === "draft",
      className: "text-green-600",
    },
    {
      label: "Pause Job",
      icon: Pause,
      onClick: (job) => pauseMutation.mutate(job.id),
      show: (job) => job.status === "active",
      className: "text-amber-600",
    },
    {
      label: "Resume Job",
      icon: Play,
      onClick: (job) => resumeMutation.mutate(job.id),
      show: (job) => job.status === "paused",
      className: "text-green-600",
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (job) => {
        if (confirm(`Delete "${job.name}"?`)) {
          deleteMutation.mutate(job.id);
        }
      },
      show: (job) => job.status === "draft",
      className: "text-red-600",
    },
  ];

  const emptyState = (
    <div className="text-center py-20 bg-white rounded-lg">
      <Tag className="w-16 h-16 text-db-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-db-gray-700 mb-2">
        No labeling jobs found
      </h3>
      <p className="text-db-gray-500 mb-6">
        {search || statusFilter
          ? "Try adjusting your filters"
          : "Create your first labeling job to start annotating data"}
      </p>
      <button
        onClick={() => setShowCreateModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
      >
        <Plus className="w-4 h-4" />
        Create Job
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
              <h1 className="text-2xl font-bold text-db-gray-900">Labeling Jobs</h1>
              <p className="text-db-gray-600 mt-1">
                Create and manage annotation workflows for your datasets
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["labeling-jobs"] })}
                className="flex items-center gap-2 px-3 py-2 text-db-gray-600 hover:text-db-gray-800 hover:bg-db-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Job
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
                placeholder="Filter jobs by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LabelingJobStatus | "")}
              className="px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
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
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-db-gray-600">Failed to load labeling jobs</p>
            </div>
          ) : (
            <DataTable
              data={filteredJobs}
              columns={columns}
              rowKey={(job) => job.id}
              onRowClick={handleViewTasks}
              rowActions={rowActions}
              emptyState={emptyState}
            />
          )}
        </div>
      </div>

      {/* Create Modal */}
      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["labeling-jobs"] });
        }}
      />

      {/* Stats Modal */}
      {statsJob && (
        <StatsModal
          job={statsJob}
          isOpen={!!statsJob}
          onClose={() => setStatsJob(null)}
        />
      )}
    </div>
  );
}
