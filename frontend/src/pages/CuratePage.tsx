/**
 * CuratePage - CURATE stage for reviewing and labeling assembled data
 *
 * Following the GCP Vertex AI pattern:
 * - Works with AssembledDataset (prompt/response pairs)
 * - Allows human labeling and verification of responses
 * - Supports AI generation of responses
 *
 * Features:
 * - Item grid/list view with prompt preview
 * - Side panel for detailed review (prompt, response, source data)
 * - Keyboard shortcuts for efficient labeling
 * - Workflow integration showing selected sheet and assembly
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Loader2,
  FileText,
  X,
  Keyboard,
  LayoutGrid,
  List,
  Database,
  ArrowRight,
  ArrowLeft,
  Layers,
  Download,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Table2,
  Eye,
} from "lucide-react";
import { DataTable, Column, RowAction } from "../components/DataTable";
import { StageSubNav, StageMode } from "../components/StageSubNav";
import { clsx } from "clsx";
import { useWorkflow } from "../context/WorkflowContext";
import {
  listAssemblies,
  getAssembly,
  previewAssembly,
  updateAssembledRow,
  generateAssemblyResponses,
  exportAssembly,
  listSheets,
  assembleSheet,
} from "../services/api";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/Skeleton";
import {
  ImageAnnotationPanel,
  AnnotationTask,
  LabelConfig,
  Annotation,
} from "../components/annotation";
import { useSheetCanonicalStats } from "../hooks/useCanonicalLabels";
import { PromoteToCanonicalModal } from "../components/PromoteToCanonicalModal";
import { QualityGatePanel } from "../components/QualityGatePanel";
import { LabelVersionHistory } from "../components/LabelVersionHistory";
import { ReviewPanel } from "../components/ReviewPanel";
import { getConfig } from "../services/api";
import type { AssembledDataset, AssembledRow, ResponseSource } from "../types";

// ============================================================================
// Status Colors and Labels
// ============================================================================

const sourceColors: Record<ResponseSource, string> = {
  empty: "bg-gray-100 text-gray-700",
  imported: "bg-blue-100 text-blue-700",
  ai_generated: "bg-purple-100 text-purple-700",
  human_labeled: "bg-green-100 text-green-700",
  human_verified: "bg-emerald-100 text-emerald-700",
  canonical: "bg-cyan-100 text-cyan-700",
};

const sourceLabels: Record<ResponseSource, string> = {
  empty: "Empty",
  imported: "Imported",
  ai_generated: "AI Generated",
  human_labeled: "Human Labeled",
  human_verified: "Verified",
  canonical: "Canonical",
};

// ============================================================================
// Image Detection Helpers
// ============================================================================

/**
 * Check if a URL looks like an image
 */
function isImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
  ];
  const lowerUrl = url.toLowerCase();
  return (
    imageExtensions.some((ext) => lowerUrl.includes(ext)) ||
    lowerUrl.includes("/images/") ||
    lowerUrl.includes("image_url")
  );
}

/**
 * Extract image URL from source data
 * Looks for common patterns: image_url, imageUrl, image, photo, picture, etc.
 */
function extractImageUrl(sourceData: Record<string, unknown>): string | null {
  const imageKeys = [
    "image_url",
    "imageUrl",
    "image",
    "photo",
    "picture",
    "thumbnail",
    "photo_url",
    "photoUrl",
    "img",
    "img_url",
    "file_path",
    "filePath",
    "url",
  ];

  for (const key of imageKeys) {
    const value = sourceData[key];
    if (typeof value === "string" && isImageUrl(value)) {
      return value;
    }
  }

  // Also check nested objects one level deep
  for (const value of Object.values(sourceData)) {
    if (typeof value === "object" && value !== null) {
      for (const key of imageKeys) {
        const nested = (value as Record<string, unknown>)[key];
        if (typeof nested === "string" && isImageUrl(nested)) {
          return nested;
        }
      }
    }
  }

  return null;
}

/**
 * Check if an assembly contains image data
 */
function assemblyHasImages(rows: AssembledRow[]): boolean {
  if (!rows || rows.length === 0) return false;
  // Check first few rows for image URLs
  return rows
    .slice(0, 5)
    .some((row) => extractImageUrl(row.source_data) !== null);
}

// ============================================================================
// Stats Bar
// ============================================================================

function StatsBar({ assembly }: { assembly: AssembledDataset }) {
  const total = assembly.total_rows || 1;
  const segments = [
    {
      key: "human_verified",
      count: assembly.human_verified_count,
      color: "bg-emerald-500",
      label: "Verified",
    },
    {
      key: "human_labeled",
      count: assembly.human_labeled_count,
      color: "bg-green-500",
      label: "Labeled",
    },
    {
      key: "ai_generated",
      count: assembly.ai_generated_count,
      color: "bg-purple-500",
      label: "AI Generated",
    },
    {
      key: "empty",
      count: assembly.empty_count || 0,
      color: "bg-gray-300",
      label: "Empty",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="h-3 bg-db-gray-100 rounded-full overflow-hidden flex">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={clsx("h-full transition-all duration-300", seg.color)}
            style={{ width: `${((seg.count || 0) / total) * 100}%` }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-db-gray-600">
        {segments
          .filter((s) => (s.count || 0) > 0)
          .map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5">
              <div className={clsx("w-2 h-2 rounded-full", seg.color)} />
              <span>
                {seg.label}: {seg.count}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ============================================================================
// Row Card Component
// ============================================================================

interface RowCardProps {
  row: AssembledRow;
  isSelected: boolean;
  onSelect: () => void;
}

function RowCard({ row, isSelected, onSelect }: RowCardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-lg border-2 p-4 cursor-pointer transition-all",
        isSelected
          ? "border-purple-500 shadow-md"
          : "border-db-gray-200 hover:border-db-gray-300",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-db-gray-500">
          Row {row.row_index + 1}
        </span>
        <span
          className={clsx(
            "text-xs px-2 py-0.5 rounded-full",
            sourceColors[row.response_source],
          )}
        >
          {sourceLabels[row.response_source]}
        </span>
      </div>

      {/* Prompt preview */}
      <div className="bg-db-gray-50 rounded-lg p-3 mb-3 text-xs font-mono overflow-hidden max-h-20">
        <p className="line-clamp-3">{row.prompt}</p>
      </div>

      {/* Response preview */}
      {row.response ? (
        <div className="bg-purple-50 rounded-lg p-2 text-xs font-mono overflow-hidden max-h-16">
          <p className="line-clamp-2 text-purple-800">{row.response}</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-400 italic">
          No response yet
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Detail Panel
// ============================================================================

interface DetailPanelProps {
  row: AssembledRow;
  assembly: AssembledDataset;
  onClose: () => void;
  onSave: (response: string, markAsVerified: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  isSaving: boolean;
  onCreateCanonicalLabel?: () => void;
}

function DetailPanel({
  row,
  assembly,
  onClose,
  onSave,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  isSaving,
  onCreateCanonicalLabel,
}: DetailPanelProps) {
  const [editedResponse, setEditedResponse] = useState(row.response || "");
  const [markAsVerified, setMarkAsVerified] = useState(false);

  // Reset when row changes
  useEffect(() => {
    setEditedResponse(row.response || "");
    setMarkAsVerified(false);
  }, [row.row_index, row.response]);

  const hasChanges = editedResponse !== (row.response || "");

  return (
    <div className="w-[520px] bg-white border-l border-db-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-db-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Row {row.row_index + 1}</span>
          <span
            className={clsx(
              "text-xs px-2 py-0.5 rounded-full",
              sourceColors[row.response_source],
            )}
          >
            {sourceLabels[row.response_source]}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-db-gray-400 hover:text-db-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Source Data */}
        <div>
          <h3 className="text-sm font-medium text-db-gray-700 mb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Source Data
          </h3>
          <div className="bg-db-gray-50 rounded-lg p-3 font-mono text-xs overflow-auto max-h-32">
            <pre>{JSON.stringify(row.source_data, null, 2)}</pre>
          </div>
        </div>

        {/* Prompt */}
        <div>
          <h3 className="text-sm font-medium text-db-gray-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            Prompt
          </h3>
          <div className="bg-purple-50 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
            {row.prompt}
          </div>
        </div>

        {/* Response Editor */}
        <div>
          <h3 className="text-sm font-medium text-db-gray-700 mb-2 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-green-600" />
            Response
            {row.response_source === "ai_generated" && (
              <span className="text-xs text-purple-600 font-normal">
                (AI generated)
              </span>
            )}
          </h3>
          <textarea
            value={editedResponse}
            onChange={(e) => setEditedResponse(e.target.value)}
            placeholder="Enter the expected response..."
            rows={8}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm resize-none"
          />
        </div>

        {/* Verify checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={markAsVerified}
            onChange={(e) => setMarkAsVerified(e.target.checked)}
            className="rounded border-db-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-db-gray-700">
            Mark as verified (ready for fine-tuning)
          </span>
        </label>

        {/* Metadata */}
        {(row.labeled_by || row.verified_by) && (
          <div className="text-xs text-db-gray-400 space-y-1 pt-2 border-t border-db-gray-100">
            {row.labeled_by && <div>Labeled by: {row.labeled_by}</div>}
            {row.labeled_at && (
              <div>Labeled at: {new Date(row.labeled_at).toLocaleString()}</div>
            )}
            {row.verified_by && <div>Verified by: {row.verified_by}</div>}
            {row.verified_at && (
              <div>
                Verified at: {new Date(row.verified_at).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Canonical Label Version History */}
        {row.canonical_label_id && (
          <LabelVersionHistory labelId={row.canonical_label_id} />
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-db-gray-200 p-4 space-y-3">
        {/* Save button */}
        <button
          onClick={() => onSave(editedResponse, markAsVerified)}
          disabled={isSaving || (!hasChanges && !markAsVerified)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {markAsVerified ? "Save & Verify" : "Save Response"}
          <kbd className="ml-2 px-1.5 py-0.5 bg-green-700 rounded text-xs">
            ⌘S
          </kbd>
        </button>

        {/* Create Canonical Label button */}
        {onCreateCanonicalLabel && row.response && (
          <button
            onClick={onCreateCanonicalLabel}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Canonical Label
          </button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-db-gray-600 hover:bg-db-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
            <kbd className="ml-1 px-1 bg-db-gray-100 rounded text-xs">←</kbd>
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-db-gray-600 hover:bg-db-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <kbd className="ml-1 px-1 bg-db-gray-100 rounded text-xs">→</kbd>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Training Data Browser Modal - Removed (using inline browse/create pattern)
// ============================================================================

// ============================================================================
// Workflow Context Banner
// ============================================================================

function WorkflowBanner() {
  const { state, goToPreviousStage, goToNextStage } = useWorkflow();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-db-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Data Source */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              <Database className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-600">Sheet</p>
              <p className="text-sm font-medium text-blue-800">
                {state.selectedSource?.name || "Not selected"}
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-db-gray-300" />

          {/* Training Data */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded">
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-purple-600">Training Data</p>
              <p className="text-sm font-medium text-purple-800">
                {state.selectedTemplate?.name || "Not selected"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousStage}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-db-gray-600 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={goToNextStage}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Continue to Label
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface CuratePageProps {
  mode?: "browse" | "create";
}

export function CuratePage({ mode = "browse" }: CuratePageProps) {
  const [stageMode, setStageMode] = useState<StageMode>("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<ResponseSource | "">("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAssemblyPicker, setShowAssemblyPicker] = useState(false);
  const [annotationMode, setAnnotationMode] = useState<"text" | "image">(
    "text",
  );
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(
    null,
  );
  const [isAssembling, setIsAssembling] = useState(false);
  const [showCanonicalLabelModal, setShowCanonicalLabelModal] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { state: workflowState } = useWorkflow();

  // Auto-load assembly from workflow context if available (e.g., after generating training data)
  useEffect(() => {
    if (workflowState.selectedAssemblyId && !selectedAssemblyId) {
      setSelectedAssemblyId(workflowState.selectedAssemblyId);
      setStageMode("browse"); // Switch to browse mode automatically
    }
  }, [workflowState.selectedAssemblyId, selectedAssemblyId]);

  // Get assembly ID from local state only (template ID is NOT an assembly ID)
  const assemblyId = selectedAssemblyId;

  // Fetch list of all assemblies for the picker
  const { data: assemblies, isLoading: assembliesLoading } = useQuery({
    queryKey: ["assemblies"],
    queryFn: () => listAssemblies(),
  });

  // Fetch config to get current user
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
    staleTime: Infinity,
  });

  // Fetch sheets for create mode (only sheets with templates)
  const { data: sheetsData, isLoading: sheetsLoading } = useQuery({
    queryKey: ["sheets"],
    queryFn: () => listSheets({ limit: 50 }),
    enabled: stageMode === "create" && !selectedAssemblyId,
  });

  // Fetch assembly metadata
  const { data: assembly, isLoading: assemblyLoading } = useQuery({
    queryKey: ["assembly", assemblyId],
    queryFn: () => getAssembly(assemblyId!),
    enabled: !!assemblyId,
  });

  // Fetch assembled rows
  const { data: previewData, isLoading: rowsLoading } = useQuery({
    queryKey: ["assemblyPreview", assemblyId, sourceFilter],
    queryFn: () =>
      previewAssembly(assemblyId!, {
        limit: 100,
        response_source: sourceFilter || undefined,
      }),
    enabled: !!assemblyId,
  });

  // Fetch canonical label stats for the sheet
  const { data: canonicalStats } = useSheetCanonicalStats(assembly?.sheet_id);

  const rows = previewData?.rows || [];
  const selectedRow =
    rows.find((r) => r.row_index === selectedRowIndex) || null;
  const selectedIndex = rows.findIndex((r) => r.row_index === selectedRowIndex);

  // Detect if this assembly contains images (for manual labeling with image annotation)
  const isManualLabelingMode =
    assembly?.template_config?.response_source_mode === "manual_labeling";
  const hasImages = useMemo(() => assemblyHasImages(rows), [rows]);
  const showImageAnnotation =
    isManualLabelingMode && hasImages && annotationMode === "image";

  // Auto-detect annotation mode when assembly loads
  useEffect(() => {
    if (isManualLabelingMode && hasImages) {
      setAnnotationMode("image");
    }
  }, [isManualLabelingMode, hasImages]);

  // Convert rows to annotation tasks for ImageAnnotationPanel
  const annotationTasks: AnnotationTask[] = useMemo(() => {
    if (!showImageAnnotation) return [];
    return rows.map((row) => ({
      id: `${assemblyId}-${row.row_index}`,
      imageUrl: extractImageUrl(row.source_data) || "",
      rowIndex: row.row_index,
      prompt: row.prompt,
      sourceData: row.source_data,
      status:
        row.response_source === "human_labeled" ||
        row.response_source === "human_verified"
          ? "annotated"
          : row.response_source === "empty"
            ? "pending"
            : "annotated",
    }));
  }, [showImageAnnotation, rows, assemblyId]);

  // Label classes from template_config, with fallback to defaults
  const annotationLabels: LabelConfig[] = useMemo(() => {
    // Pull from template_config if available
    const templateLabels = assembly?.template_config?.label_classes;
    if (templateLabels && templateLabels.length > 0) {
      return templateLabels.map((l) => ({
        name: l.name,
        color: l.color || "#6b7280",
      }));
    }
    // Default fallback labels
    return [
      { name: "Defect", color: "#ef4444" },
      { name: "Normal", color: "#22c55e" },
      { name: "Warning", color: "#f59e0b" },
      { name: "Unknown", color: "#6b7280" },
    ];
  }, [assembly?.template_config?.label_classes]);

  // Update row mutation
  const updateMutation = useMutation({
    mutationFn: ({
      rowIndex,
      response,
      markAsVerified,
    }: {
      rowIndex: number;
      response: string;
      markAsVerified: boolean;
    }) =>
      updateAssembledRow(assemblyId!, rowIndex, {
        response,
        mark_as_verified: markAsVerified,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assemblyPreview"] });
      queryClient.invalidateQueries({ queryKey: ["assembly"] });
      toast.success("Response saved");
    },
    onError: (error) =>
      toast.error(
        "Failed to save",
        error instanceof Error ? error.message : "Unknown error",
      ),
  });

  // Generate AI responses mutation
  const generateMutation = useMutation({
    mutationFn: () =>
      generateAssemblyResponses(assemblyId!, { include_few_shot: true }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["assemblyPreview"] });
      queryClient.invalidateQueries({ queryKey: ["assembly"] });
      toast.success(
        "AI generation complete",
        `Generated ${result.generated_count} responses`,
      );
    },
    onError: (error) =>
      toast.error(
        "Generation failed",
        error instanceof Error ? error.message : "Unknown error",
      ),
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () =>
      exportAssembly(assemblyId!, {
        format: "openai_chat",
        volume_path: `/Volumes/main/ontos_ml_workbench/exports/assembly_${assemblyId}.jsonl`,
        include_only_verified: true,
        include_system_instruction: true,
      }),
    onSuccess: (result) => {
      toast.success(
        "Export complete",
        `Exported ${result.examples_exported} examples to ${result.volume_path}`,
      );
    },
    onError: (error) =>
      toast.error(
        "Export failed",
        error instanceof Error ? error.message : "Unknown error",
      ),
  });

  // Handle annotation save (for image annotation mode)
  const handleAnnotationSave = useCallback(
    (taskId: string, annotation: Annotation) => {
      const rowIndex = parseInt(taskId.split("-").pop() || "0", 10);
      // Save annotation as JSON string in the response field
      updateMutation.mutate({
        rowIndex,
        response: JSON.stringify(annotation.result),
        markAsVerified: false,
      });
    },
    [updateMutation],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (rows.length === 0) return;

      // Don't capture if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key.toLowerCase()) {
        case "arrowleft":
          e.preventDefault();
          if (selectedIndex > 0) {
            setSelectedRowIndex(rows[selectedIndex - 1].row_index);
          }
          break;
        case "arrowright":
          e.preventDefault();
          if (selectedIndex < rows.length - 1) {
            setSelectedRowIndex(rows[selectedIndex + 1].row_index);
          } else if (selectedIndex === -1 && rows.length > 0) {
            setSelectedRowIndex(rows[0].row_index);
          }
          break;
        case "escape":
          e.preventDefault();
          setSelectedRowIndex(null);
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts((s) => !s);
          break;
      }
    },
    [rows, selectedIndex],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSaveRow = (response: string, markAsVerified: boolean) => {
    if (selectedRowIndex === null) return;
    updateMutation.mutate({
      rowIndex: selectedRowIndex,
      response,
      markAsVerified,
    });
  };

  const isLoading = assemblyLoading || rowsLoading;

  // Handle assembly selection
  const handleSelectAssembly = (id: string) => {
    setSelectedAssemblyId(id);
    queryClient.invalidateQueries({ queryKey: ["assembly", id] });
    queryClient.invalidateQueries({ queryKey: ["assemblyPreview", id] });
  };

  // Handle creating assembly from sheet
  const handleCreateAssembly = async (sheetId: string) => {
    setIsAssembling(true);
    try {
      const result = await assembleSheet(sheetId, {});
      toast.success(
        "Training Data created!",
        `Created ${result.total_items} prompt/response pairs`,
      );
      setSelectedAssemblyId(result.assembly_id);
      queryClient.invalidateQueries({ queryKey: ["assemblies"] });
    } catch (err) {
      toast.error(
        "Failed to create training data",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setIsAssembling(false);
    }
  };

  // No assembly selected - show browse/create modes with table
  if (!assemblyId) {
    const filteredAssemblies = (assemblies || []).filter((asm) =>
      (asm.sheet_name || asm.id)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );

    const sheetsWithTemplates = (sheetsData?.sheets || []).filter(
      (s) => s.has_template,
    );
    const filteredSheets = sheetsWithTemplates.filter((sheet) =>
      sheet.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // BROWSE MODE: Show table of existing assemblies
    if (stageMode === "browse") {
      // Define table columns for assemblies
      const columns: Column<AssembledDataset>[] = [
        {
          key: "name",
          header: "Training Data Name",
          width: "35%",
          render: (asm) => (
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-db-gray-900">
                  {asm.sheet_name || asm.id.slice(0, 8)}
                </div>
                {asm.template_config?.name && (
                  <div className="text-sm text-db-gray-500 truncate">
                    Template: {asm.template_config.name}
                  </div>
                )}
              </div>
            </div>
          ),
        },
        {
          key: "rows",
          header: "Total Rows",
          width: "15%",
          render: (asm) => (
            <span className="text-sm text-db-gray-600">
              {asm.total_rows.toLocaleString()}
            </span>
          ),
        },
        {
          key: "verified",
          header: "Verified",
          width: "15%",
          render: (asm) => (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-db-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${(asm.human_verified_count / asm.total_rows) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-db-gray-600">
                {asm.human_verified_count}
              </span>
            </div>
          ),
        },
        {
          key: "type",
          header: "Type",
          width: "15%",
          render: (asm) => (
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium",
                asm.template_config?.response_source_mode === "manual_labeling"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700",
              )}
            >
              {asm.template_config?.response_source_mode === "manual_labeling"
                ? "Manual Labeling"
                : "AI Generated"}
            </span>
          ),
        },
        {
          key: "updated",
          header: "Last Updated",
          width: "20%",
          render: (asm) => (
            <span className="text-sm text-db-gray-500">
              {asm.updated_at
                ? new Date(asm.updated_at).toLocaleDateString()
                : "N/A"}
            </span>
          ),
        },
      ];

      // Define row actions
      const rowActions: RowAction<AssembledDataset>[] = [
        {
          label: "Open",
          icon: Eye,
          onClick: (asm) => handleSelectAssembly(asm.id),
          className: "text-teal-600",
        },
        {
          label: "Export",
          icon: Download,
          onClick: async (asm) => {
            try {
              await exportAssembly(asm.id, {
                format: "openai_chat",
                volume_path: `/Volumes/main/default/datasets/assembly_${asm.id}.jsonl`,
                include_only_verified: false,
                include_system_instruction: true,
              });
              toast.success("Exported", "Training Data exported successfully");
            } catch (err) {
              toast.error(
                "Export failed",
                err instanceof Error ? err.message : "Unknown error",
              );
            }
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
            {searchQuery
              ? "Try adjusting your search"
              : "Create your first assembly from a sheet with a template"}
          </p>
          <button
            onClick={() => setStageMode("create")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            Create Training Data
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
                  <h1 className="text-2xl font-bold text-db-gray-900">
                    Assembled Datasets
                  </h1>
                  <p className="text-db-gray-600 mt-1">
                    Review and label prompt/response pairs for fine-tuning
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

          {/* Stage Sub-Navigation */}
          <StageSubNav
            stage="label"
            mode={stageMode}
            onModeChange={setStageMode}
            browseCount={assemblies?.length}
          />

          {/* Search */}
          <div className="px-6 pt-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
                <Filter className="w-4 h-4 text-db-gray-400" />
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assemblies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-sm text-db-gray-500 hover:text-db-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 px-6 pb-6 pt-4 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {assembliesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                </div>
              ) : (
                <DataTable
                  data={filteredAssemblies}
                  columns={columns}
                  rowKey={(asm) => asm.id}
                  onRowClick={(asm) => handleSelectAssembly(asm.id)}
                  rowActions={rowActions}
                  emptyState={emptyState}
                />
              )}
            </div>
          </div>
        </div>
      );
    }

    // CREATE MODE: Show sheet selection to create new assembly
    if (stageMode === "create") {
      return (
        <div className="flex-1 flex flex-col bg-db-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-db-gray-200 px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl font-bold text-db-gray-900">
                Create Training Data
              </h1>
              <p className="text-db-gray-600 mt-1">
                Select a sheet with a template to create prompt/response pairs
              </p>
            </div>
          </div>

          {/* Stage Sub-Navigation */}
          <StageSubNav
            stage="label"
            mode={stageMode}
            onModeChange={setStageMode}
            browseCount={assemblies?.length}
          />

          {/* Search */}
          <div className="px-6 pt-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-db-gray-200">
                <Filter className="w-4 h-4 text-db-gray-400" />
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-db-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sheets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-0 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sheets Grid */}
          <div className="flex-1 px-6 pb-6 pt-4 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {sheetsLoading || isAssembling ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                  {isAssembling && (
                    <span className="ml-3 text-db-gray-600">
                      Creating assembly...
                    </span>
                  )}
                </div>
              ) : filteredSheets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => handleCreateAssembly(sheet.id)}
                      disabled={isAssembling}
                      className="p-4 text-left border border-db-gray-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                          <Table2 className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-db-gray-900 truncate">
                            {sheet.name}
                          </div>
                          {sheet.template_config && (
                            <div className="text-xs text-db-gray-500 mt-1 truncate">
                              Template: {sheet.template_config.name}
                            </div>
                          )}
                          <div className="flex gap-3 mt-2 text-xs text-db-gray-500">
                            <span>{sheet.columns?.length ?? 0} columns</span>
                            {sheet.item_count && (
                              <span>
                                {sheet.item_count.toLocaleString()} rows
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-lg">
                  <Table2 className="w-16 h-16 text-db-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-db-gray-700 mb-2">
                    No sheets with templates found
                  </h3>
                  <p className="text-db-gray-500 mb-6">
                    Create a sheet and attach a template first
                  </p>
                  <button
                    onClick={() =>
                      (window.location.href =
                        window.location.origin + "/#/data")
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    Go to Data Stage
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Workflow Banner */}
          <WorkflowBanner />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-db-gray-900">
                Label Q&A Pairs
              </h1>
              <p className="text-db-gray-600 mt-1">
                {showImageAnnotation
                  ? "Annotate images with bounding boxes, polygons, or masks"
                  : "Review, edit, and approve Q&A pairs for training"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Annotation Mode Toggle (when images detected) */}
              {isManualLabelingMode && hasImages && (
                <div className="flex items-center gap-1 bg-db-gray-100 rounded-lg p-1 mr-2">
                  <button
                    onClick={() => setAnnotationMode("text")}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                      annotationMode === "text"
                        ? "bg-white text-purple-600 shadow-sm"
                        : "text-db-gray-600 hover:text-db-gray-900",
                    )}
                  >
                    <Edit3 className="w-4 h-4" />
                    Text
                  </button>
                  <button
                    onClick={() => setAnnotationMode("image")}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                      annotationMode === "image"
                        ? "bg-white text-purple-600 shadow-sm"
                        : "text-db-gray-600 hover:text-db-gray-900",
                    )}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowShortcuts(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-db-gray-600 hover:bg-db-gray-100 rounded-lg"
              >
                <Keyboard className="w-4 h-4" />
                Shortcuts
              </button>
            </div>
          </div>

          {/* Training Data Info & Actions */}
          {assembly && (
            <div className="bg-white rounded-lg border border-db-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="font-medium text-db-gray-800">
                      {assembly.template_config.name || "Training Data"}
                    </h2>
                    <p className="text-sm text-db-gray-500">
                      {assembly.total_rows} rows · Status: {assembly.status}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAssemblyPicker(true)}
                    className="text-xs text-purple-600 hover:text-purple-800 underline"
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {(assembly.empty_count || 0) > 0 && (
                    <button
                      onClick={() => generateMutation.mutate()}
                      disabled={generateMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {generateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      Generate {assembly.empty_count} Empty
                    </button>
                  )}
                  {assembly.human_verified_count > 0 && (
                    <button
                      onClick={() => exportMutation.mutate()}
                      disabled={exportMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {exportMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Export {assembly.human_verified_count} Verified
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <StatsBar assembly={assembly} />
            </div>
          )}

          {/* Asset Review */}
          {assembly && (
            <div className="mb-6">
              <ReviewPanel
                assetType="training_sheet"
                assetId={assembly.id}
                assetName={assembly.template_config.name || "Training Data"}
              />
            </div>
          )}

          {/* Canonical Label Indicator */}
          {canonicalStats && canonicalStats.total_labels > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">
                      Canonical Labels Available
                    </h3>
                    <p className="text-sm text-blue-700">
                      {canonicalStats.total_labels} expert-validated labels
                      available
                      {canonicalStats.coverage_percent && (
                        <>
                          {" "}
                          ({canonicalStats.coverage_percent.toFixed(1)}%
                          coverage)
                        </>
                      )}
                      {" · "}
                      Avg {canonicalStats.avg_reuse_count.toFixed(1)}x reuse
                    </p>
                  </div>
                </div>
                <div className="text-xs text-blue-600">
                  {assembly?.canonical_reused_count || 0} rows use canonical
                  labels
                </div>
              </div>
            </div>
          )}

          {/* Quality Gate */}
          {assemblyId && (
            <div className="mb-6">
              <QualityGatePanel collectionId={assemblyId} />
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-db-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-db-gray-600">
                No rows to display
              </h3>
              <p className="text-db-gray-400 mt-1">
                {sourceFilter
                  ? `No rows with status "${sourceLabels[sourceFilter]}"`
                  : "The assembly has no rows yet"}
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4">
                {/* Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-db-gray-600">Filter:</span>
                  {(
                    [
                      "",
                      "empty",
                      "ai_generated",
                      "human_labeled",
                      "human_verified",
                    ] as const
                  ).map((source) => (
                    <button
                      key={source}
                      onClick={() => setSourceFilter(source)}
                      className={clsx(
                        "px-3 py-1 text-sm rounded-full transition-colors",
                        sourceFilter === source
                          ? "bg-purple-100 text-purple-700"
                          : "bg-db-gray-100 text-db-gray-600 hover:bg-db-gray-200",
                      )}
                    >
                      {source ? sourceLabels[source] : "All"}
                    </button>
                  ))}
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 bg-db-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={clsx(
                      "p-1.5 rounded",
                      viewMode === "grid"
                        ? "bg-white shadow-sm"
                        : "text-db-gray-500",
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={clsx(
                      "p-1.5 rounded",
                      viewMode === "list"
                        ? "bg-white shadow-sm"
                        : "text-db-gray-500",
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items grid/list */}
              <div
                className={clsx(
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "space-y-2",
                )}
              >
                {rows.map((row) => (
                  <RowCard
                    key={row.row_index}
                    row={row}
                    isSelected={row.row_index === selectedRowIndex}
                    onSelect={() => setSelectedRowIndex(row.row_index)}
                  />
                ))}
              </div>

              {/* Row count */}
              <div className="mt-4 text-sm text-db-gray-500 text-center">
                Showing {rows.length} of {previewData?.total_rows || 0} rows
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Panel - Text mode or Image Annotation mode */}
      {selectedRow && assembly && !showImageAnnotation && (
        <DetailPanel
          row={selectedRow}
          assembly={assembly}
          onClose={() => setSelectedRowIndex(null)}
          onSave={handleSaveRow}
          onNext={() => {
            if (selectedIndex < rows.length - 1) {
              setSelectedRowIndex(rows[selectedIndex + 1].row_index);
            }
          }}
          onPrevious={() => {
            if (selectedIndex > 0) {
              setSelectedRowIndex(rows[selectedIndex - 1].row_index);
            }
          }}
          hasNext={selectedIndex < rows.length - 1}
          hasPrevious={selectedIndex > 0}
          isSaving={updateMutation.isPending}
          onCreateCanonicalLabel={() => setShowCanonicalLabelModal(true)}
        />
      )}

      {/* Image Annotation Panel */}
      {showImageAnnotation &&
        selectedIndex >= 0 &&
        annotationTasks.length > 0 && (
          <div className="w-[700px] border-l border-db-gray-200">
            <ImageAnnotationPanel
              task={annotationTasks[selectedIndex]}
              tasks={annotationTasks}
              currentIndex={selectedIndex}
              labels={annotationLabels}
              defaultAnnotationType="bbox"
              onSave={handleAnnotationSave}
              onSkip={(taskId) => {
                // Move to next task on skip
                if (selectedIndex < rows.length - 1) {
                  setSelectedRowIndex(rows[selectedIndex + 1].row_index);
                }
              }}
              onFlag={(taskId, reason) => {
                toast.info("Task flagged", reason);
              }}
              onNavigate={(index) => {
                if (index >= 0 && index < rows.length) {
                  setSelectedRowIndex(rows[index].row_index);
                }
              }}
            />
          </div>
        )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-db-gray-400 hover:text-db-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { key: "←", action: "Previous row" },
                { key: "→", action: "Next row" },
                { key: "⌘S", action: "Save response" },
                { key: "Esc", action: "Close detail panel" },
                { key: "?", action: "Toggle shortcuts" },
              ].map(({ key, action }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-db-gray-600">{action}</span>
                  <kbd className="px-2 py-1 bg-db-gray-100 rounded text-sm font-mono">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Training Data Picker Modal */}
      {showAssemblyPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Select Training Data</h2>
              <button
                onClick={() => setShowAssemblyPicker(false)}
                className="text-db-gray-400 hover:text-db-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assembliesLoading ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading assemblies...
              </div>
            ) : assemblies && assemblies.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {assemblies.map((asm) => (
                  <button
                    key={asm.id}
                    onClick={() => {
                      setSelectedAssemblyId(asm.id);
                      setShowAssemblyPicker(false);
                    }}
                    className={clsx(
                      "w-full text-left px-4 py-3 border rounded-lg transition-colors",
                      asm.id === assemblyId
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-purple-400 hover:bg-purple-50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800">
                          {asm.template_config?.name || asm.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {asm.total_rows} rows · {asm.human_verified_count}{" "}
                          verified
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {asm.template_config?.response_source_mode ===
                          "manual_labeling" && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Manual Labeling
                          </span>
                        )}
                        {asm.id === assemblyId && (
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No assemblies found. Create one from the Template Builder.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Promote to Canonical Label Modal */}
      {selectedRow && assembly && (
        <PromoteToCanonicalModal
          isOpen={showCanonicalLabelModal}
          onClose={() => setShowCanonicalLabelModal(false)}
          row={selectedRow}
          sheetId={assembly.sheet_id}
          labelType={assembly.template_config?.label_type || "classification"}
          labeledBy={config?.current_user || "unknown"}
        />
      )}
    </div>
  );
}

export default CuratePage;
