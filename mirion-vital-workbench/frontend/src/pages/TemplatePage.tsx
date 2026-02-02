/**
 * TemplatePage - TEMPLATE stage for managing Databits (prompt templates)
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
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  Archive,
  Database,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listTemplates,
  deleteTemplate,
  publishTemplate,
  archiveTemplate,
} from "../services/api";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";
import { useWorkflow } from "../context/WorkflowContext";
import { DSPyOptimizationPage } from "./DSPyOptimizationPage";
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
// Template Card
// ============================================================================

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDSPy: (template: Template) => void;
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
  onDSPy,
}: TemplateCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const status = statusConfig[template.status];

  return (
    <div
      onClick={() => onSelect(template)}
      className={clsx(
        "bg-white rounded-lg border-2 p-4 cursor-pointer transition-all",
        isSelected
          ? "border-purple-500 shadow-md ring-2 ring-purple-100"
          : "border-db-gray-200 hover:border-purple-300 hover:shadow-sm",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={clsx(
              "p-2 rounded-lg",
              isSelected ? "bg-purple-100" : "bg-purple-50",
            )}
          >
            {isSelected ? (
              <Check className="w-5 h-5 text-purple-600" />
            ) : (
              <FileText className="w-5 h-5 text-purple-600" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-db-gray-800">{template.name}</h3>
            <p className="text-sm text-db-gray-500 mt-1 line-clamp-2">
              {template.description || "No description"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={clsx(
                  "text-xs px-2 py-0.5 rounded-full",
                  status.bg,
                  status.color,
                )}
              >
                {status.label}
              </span>
              <span className="text-xs text-db-gray-400">
                v{template.version}
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-db-gray-400 hover:text-db-gray-600 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-db-gray-200 py-1 min-w-[140px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(template);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDSPy(template);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2 text-purple-600"
                >
                  <Zap className="w-4 h-4" /> DSPy Integration
                </button>
                {template.status === "draft" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublish(template.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2 text-green-600"
                  >
                    <CheckCircle className="w-4 h-4" /> Publish
                  </button>
                )}
                {template.status !== "archived" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(template.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" /> Archive
                  </button>
                )}
                {template.status === "draft" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(template.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-db-gray-100 flex items-center justify-between text-xs text-db-gray-400">
        <span>Model: {template.base_model.split("-").slice(-2).join("-")}</span>
        <span>
          {template.updated_at
            ? new Date(template.updated_at).toLocaleDateString()
            : ""}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface TemplatePageProps {
  onEditTemplate: (template: Template | null) => void;
}

export function TemplatePage({ onEditTemplate }: TemplatePageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "">("");
  const [dspyTemplate, setDspyTemplate] = useState<Template | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { state, setSelectedTemplate, goToNextStage, goToPreviousStage } =
    useWorkflow();

  const { data, isLoading } = useQuery({
    queryKey: ["templates", search, statusFilter],
    queryFn: () =>
      listTemplates({
        search: search || undefined,
        status: statusFilter || undefined,
      }),
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

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Workflow Banner */}
        <WorkflowBanner />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-db-gray-900">
              Select a Databit
            </h1>
            <p className="text-db-gray-600 mt-1">
              Choose a prompt template to apply to your data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onEditTemplate(null)}
              className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Databit
            </button>
            {canContinue && (
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Continue to Curate
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Template Indicator */}
        {state.selectedTemplate && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-purple-600" />
            <span className="text-purple-800">
              Selected: <strong>{state.selectedTemplate.name}</strong>
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-db-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-db-gray-600">
              No Databits yet
            </h3>
            <p className="text-db-gray-400 mt-1">
              Create your first prompt template to get started
            </p>
            <button
              onClick={() => onEditTemplate(null)}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Databit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={state.selectedTemplate?.id === template.id}
                onSelect={handleSelectTemplate}
                onEdit={onEditTemplate}
                onDelete={(id) => deleteMutation.mutate(id)}
                onPublish={(id) => publishMutation.mutate(id)}
                onArchive={(id) => archiveMutation.mutate(id)}
                onDSPy={setDspyTemplate}
              />
            ))}
          </div>
        )}

        {/* Bottom Navigation */}
        {templates.length > 0 && (
          <div className="mt-8 pt-6 border-t border-db-gray-200 flex items-center justify-between">
            <button
              onClick={() => goToPreviousStage()}
              className="flex items-center gap-2 px-4 py-2 text-db-gray-600 hover:text-db-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Data
            </button>
            {canContinue ? (
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Continue to Curate
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-sm text-db-gray-500">
                {!state.selectedSource
                  ? "Select a data source first"
                  : "Select a template to continue"}
              </p>
            )}
          </div>
        )}
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
