/**
 * TemplatePage - TEMPLATE stage for managing prompt templates
 *
 * Shows selected data source from previous stage and allows selecting
 * a template to use for the workflow.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  CheckCircle,
  Archive,
  Database,
  ArrowRight,
  ArrowLeft,
  Zap,
  Loader2,
  RefreshCw,
  Filter,
  Copy,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listTemplates,
  deleteTemplate,
  publishTemplate,
  archiveTemplate,
  createTemplateVersion,
} from "../services/api";
import { useToast } from "../components/Toast";
import { useWorkflow } from "../context/WorkflowContext";
import { DSPyOptimizationPage } from "./DSPyOptimizationPage";
import { DataTable, Column, RowAction } from "../components/DataTable";
import type { Template, TemplateStatus } from "../types";

const statusConfig: Record<
  TemplateStatus,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "text-amber-700", bg: "bg-amber-50" },
  published: { label: "Published", color: "text-green-700", bg: "bg-green-50" },
  archived: { label: "Archived", color: "text-gray-500", bg: "bg-gray-100" },
};

// ============================================================================
// Workflow Context Banner
// ============================================================================

function WorkflowBanner() {
  const { state, goToPreviousStage } = useWorkflow();

  if (!state.selectedSource) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">
              No data source selected
            </p>
            <p className="text-sm text-amber-600">
              Go back to the DATA stage to select a table first.
            </p>
          </div>
          <button
            onClick={goToPreviousStage}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Database className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-blue-600">Using data from:</p>
          <p className="font-medium text-blue-800">
            {state.selectedSource.fullPath}
          </p>
        </div>
        <button
          onClick={goToPreviousStage}
          className="ml-auto text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          Change
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Table View Components - Removed (using DataTable component now)
// ============================================================================

// ============================================================================
// Main Component
// ============================================================================

interface TemplatePageProps {
  onEditTemplate: (template: Template | null) => void;
  onClose?: () => void;
}

export function TemplatePage({ onEditTemplate, onClose }: TemplatePageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "">("");
  const [dspyTemplate, setDspyTemplate] = useState<Template | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { state, setSelectedTemplate, goToNextStage } = useWorkflow();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ["templates", search, statusFilter],
    queryFn: async () => {
      const result = await listTemplates({
        search: search || undefined,
        status: statusFilter || undefined,
      });

      return result;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Databit deleted");
    },
    onError: (error) => toast.error("Delete failed", error.message),
  });

  const publishMutation = useMutation({
    mutationFn: publishTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Databit published", "Template is now available for use");
    },
    onError: (error) => toast.error("Publish failed", error.message),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.info("Databit archived");
    },
    onError: (error) => toast.error("Archive failed", error.message),
  });

  const versionMutation = useMutation({
    mutationFn: createTemplateVersion,
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Version created", `New version: v${newVersion.version}`);
    },
    onError: (error) => toast.error("Version creation failed", error.message),
  });

  const templates = data?.templates || [];

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate({
      id: template.id,
      name: template.name,
      description: template.description,
      system_prompt: template.system_prompt,
    });
    toast.info("Template selected", template.name);
  };

  const handleContinue = () => {
    if (state.selectedTemplate) {
      goToNextStage();
      toast.success(
        "Moving to Curate",
        "Configure your data curation settings",
      );
    }
  };

  const canContinue = state.selectedSource && state.selectedTemplate;

  // Define table columns
  const columns: Column<Template>[] = [
    {
      key: "name",
      header: "Name",
      width: "30%",
      render: (template) => (
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-db-gray-900">{template.name}</div>
            {template.description && (
              <div className="text-sm text-db-gray-500 truncate">
                {template.description}
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
      render: (template) => {
        const status = statusConfig[template.status];
        return (
          <span
            className={clsx(
              "px-2 py-1 rounded-full text-xs font-medium",
              status.bg,
              status.color,
            )}
          >
            {status.label}
          </span>
        );
      },
    },
    {
      key: "model",
      header: "Base Model",
      width: "20%",
      render: (template) => (
        <span className="text-sm text-db-gray-600">
          {template.base_model.split("-").slice(-3).join("-")}
        </span>
      ),
    },
    {
      key: "version",
      header: "Version",
      width: "10%",
      render: (template) => (
        <span className="text-sm text-db-gray-600">v{template.version}</span>
      ),
    },
    {
      key: "updated",
      header: "Last Updated",
      width: "15%",
      render: (template) => (
        <span className="text-sm text-db-gray-500">
          {template.updated_at
            ? new Date(template.updated_at).toLocaleDateString()
            : "N/A"}
        </span>
      ),
    },
  ];

  // Define row actions
  const rowActions: RowAction<Template>[] = [
    {
      label: "Select for Workflow",
      icon: CheckCircle,
      onClick: handleSelectTemplate,
      className: "text-purple-600",
    },
    {
      label: "Edit",
      icon: Edit,
      onClick: onEditTemplate,
    },
    {
      label: "DSPy Optimization",
      icon: Zap,
      onClick: setDspyTemplate,
      className: "text-purple-600",
    },
    {
      label: "Publish",
      icon: CheckCircle,
      onClick: (template) => publishMutation.mutate(template.id),
      show: (template) => template.status === "draft",
      className: "text-green-600",
    },
    {
      label: "Archive",
      icon: Archive,
      onClick: (template) => archiveMutation.mutate(template.id),
      show: (template) => template.status !== "archived",
    },
    {
      label: "Create Version",
      icon: Copy,
      onClick: (template) => versionMutation.mutate(template.id),
      show: (template) => template.status === "published",
      className: "text-blue-600",
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (template) => {
        if (confirm(`Delete "${template.name}"?`)) {
          deleteMutation.mutate(template.id);
        }
      },
      show: (template) => template.status === "draft",
      className: "text-red-600",
    },
  ];

  const emptyState = (
    <div className="text-center py-20 bg-white rounded-lg">
      <FileText className="w-16 h-16 text-db-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-db-gray-700 mb-2">
        No templates found
      </h3>
      <p className="text-db-gray-500 mb-6">
        {search || statusFilter
          ? "Try adjusting your filters"
          : "Create your first Databit to get started"}
      </p>
      <button
        onClick={() => onEditTemplate(null)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        <Plus className="w-4 h-4" />
        Create Template
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-db-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-db-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-db-gray-900 dark:text-white">
                Prompt Templates
              </h1>
              <p className="text-db-gray-600 dark:text-gray-400 mt-1">
                Manage reusable prompt templates for your AI workflows
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["templates"] })
                }
                className="flex items-center gap-2 px-3 py-2 text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white hover:bg-db-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => onEditTemplate(null)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white hover:bg-db-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Banner */}
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <WorkflowBanner />

          {/* Selected Template Indicator */}
          {state.selectedTemplate && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <span className="text-purple-800">
                  Selected: <strong>{state.selectedTemplate.name}</strong>
                </span>
              </div>
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  canContinue
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-db-gray-200 text-db-gray-500 cursor-not-allowed",
                )}
              >
                Continue to Curate
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6">
        <div className="max-w-7xl mx-auto mb-4">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
            <Filter className="w-4 h-4 text-db-gray-400" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
              <input
                type="text"
                placeholder="Filter templates by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as TemplateStatus | "")
              }
              className="px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
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
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="ml-3 text-db-gray-600">Loading templates...</p>
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 font-medium mb-2">
                Failed to load templates
              </div>
              <div className="text-red-500 text-sm mb-4">
                {error?.message || "Unknown error"}
              </div>
              <button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["templates"] })
                }
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Debug Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
                <strong>Debug:</strong> Total: {data?.total || 0}, Templates:{" "}
                {templates.length}, Loading: {isLoading.toString()}, Error:{" "}
                {isError.toString()}
              </div>

              <DataTable
                data={templates}
                columns={columns}
                rowKey={(template) => template.id}
                onRowClick={(template) => {
                  onEditTemplate(template);
                }}
                rowActions={rowActions}
                emptyState={emptyState}
              />
            </>
          )}
        </div>
      </div>

      {/* DSPy Optimization Modal */}
      {dspyTemplate && (
        <DSPyOptimizationPage
          template={dspyTemplate}
          onClose={() => setDspyTemplate(null)}
        />
      )}
    </div>
  );
}
